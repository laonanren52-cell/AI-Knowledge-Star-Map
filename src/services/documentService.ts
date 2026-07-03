import type { DocumentKind, ParsedDocument, ParseDiagnostics, TextChunk, UploadValidationResult } from "../types/document";

const textLikeExtensions = new Set(["txt", "md", "csv", "json", "html", "htm", "rtf", "xml", "log"]);
const officeOpenXmlExtensions = new Set(["docx", "pptx", "xlsx"]);
const maxUploadSize = 50 * 1024 * 1024;
const minimumReliableLength = 40;
const minimumChunkableLength = 120;
const ocrAvailable = false;

interface ParseOptions {
  forceAnalyze?: boolean;
}

type ZipEntry = {
  name: string;
  compression: number;
  compressedSize: number;
  data: Uint8Array;
};

export function validateUpload(file: File | null): UploadValidationResult {
  if (!file) return { ok: false, message: "请选择需要分析的资料。" };
  if (file.size === 0) return { ok: false, message: "文件为空，请上传包含正文的资料。" };
  if (file.size > maxUploadSize) return { ok: false, message: "文件超过 50MB，请先压缩或拆分后再上传。" };
  return { ok: true };
}

export async function parseUploadedFile(file: File, options: ParseOptions = {}): Promise<ParsedDocument> {
  const kind = getDocumentKind(file.name);
  try {
    const rawText = await extractText(file, kind);
    const normalized = normalizeContent(rawText);
    const diagnostics = assessTextQuality(normalized, kind, options.forceAnalyze);
    const chunks = diagnostics.canAnswer ? buildTextChunks(normalized, file.name) : [];
    return { text: normalized, kind, diagnostics: { ...diagnostics, chunkCount: chunks.length }, chunks };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "未知解析错误";
    return buildFailedParse(file, kind, `当前文件正文解析失败，暂不能用于可靠问答。${reason}`);
  }
}

export async function readUploadContent(file: File): Promise<string> {
  return (await parseUploadedFile(file)).text;
}

export function buildFailedParse(
  file: File,
  kind = getDocumentKind(file.name),
  message = "当前文件正文解析失败，暂不能用于可靠问答。",
): ParsedDocument {
  const diagnostics: ParseDiagnostics = {
    status: "failed",
    qualityLevel: "failed",
    message,
    extractedLength: 0,
    readabilityScore: 0,
    chineseRatio: 0,
    abnormalCharRatio: 0,
    newlineAnomalyScore: 0,
    isGarbled: false,
    needsOcr: kind === "pdf",
    ocrAvailable,
    ocrStatus: kind === "pdf" ? (ocrAvailable ? "available" : "not_configured") : "not_needed",
    chunkCount: 0,
    canAnswer: false,
    allowContinue: false,
    requiresUserConfirmation: false,
    preview: "",
    nextSuggestion:
      kind === "pdf"
        ? "请上传文字版 PDF、Word 文档，或配置 OCR 后重新解析。"
        : "请确认文件没有损坏，或改用 TXT / Markdown / Word 文档重新上传。",
  };
  return { text: "", kind, diagnostics, chunks: [] };
}

function getDocumentKind(fileName: string): DocumentKind {
  const extension = getExtension(fileName);
  if (extension === "htm") return "html";
  if (
    extension === "txt" ||
    extension === "md" ||
    extension === "pdf" ||
    extension === "docx" ||
    extension === "pptx" ||
    extension === "xlsx" ||
    extension === "csv" ||
    extension === "json" ||
    extension === "html"
  ) {
    return extension;
  }
  return "unknown";
}

function getExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

async function extractText(file: File, kind: DocumentKind) {
  const extension = getExtension(file.name);
  if (textLikeExtensions.has(extension)) return readTextLikeFile(file, extension);
  if (kind === "pdf") return extractPdfText(file);
  if (officeOpenXmlExtensions.has(extension)) return extractOfficeOpenXmlText(file, extension);
  throw new Error("该格式暂未提供浏览器端正文解析。");
}

async function readTextLikeFile(file: File, extension: string) {
  const buffer = await file.arrayBuffer();
  const utf8 = decodeBuffer(buffer, "utf-8");
  const gb18030 = decodeBuffer(buffer, "gb18030");
  const text = qualityPenalty(gb18030) < qualityPenalty(utf8) ? gb18030 : utf8;
  if (extension === "html" || extension === "htm" || extension === "xml") return stripTags(decodeXmlEntities(text));
  if (extension === "rtf") return stripRtf(text);
  return text;
}

function decodeBuffer(buffer: ArrayBuffer, encoding: string) {
  try {
    return new TextDecoder(encoding).decode(buffer);
  } catch {
    return new TextDecoder("utf-8").decode(buffer);
  }
}

function qualityPenalty(text: string) {
  const sample = text.slice(0, 3000);
  const replacement = (sample.match(/\uFFFD/g) ?? []).length;
  const control = (sample.match(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g) ?? []).length;
  return replacement * 4 + control * 2;
}

async function extractPdfText(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const raw = new TextDecoder("latin1").decode(bytes.slice(0, Math.min(bytes.length, 10 * 1024 * 1024)));
  const literalStrings = [...raw.matchAll(/\((?:\\.|[^\\()]){2,}\)/g)]
    .map((match) => decodePdfString(match[0].slice(1, -1)))
    .filter((value) => /[\p{L}\p{N}\u4e00-\u9fa5]/u.test(value));
  const hexStrings = [...raw.matchAll(/<([0-9A-Fa-f]{8,})>/g)]
    .map((match) => decodePdfHexString(match[1]))
    .filter((value) => /[\p{L}\p{N}\u4e00-\u9fa5]/u.test(value));
  return [...literalStrings, ...hexStrings].join(" ");
}

function decodePdfString(value: string) {
  return value
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\n")
    .replace(/\\t/g, " ")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\");
}

function decodePdfHexString(hex: string) {
  const bytes = new Uint8Array(hex.match(/.{1,2}/g)?.map((item) => parseInt(item, 16)) ?? []);
  if (bytes.length > 2 && bytes[0] === 0xfe && bytes[1] === 0xff) return decodeUtf16Be(bytes.slice(2));
  return decodeBuffer(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), "utf-8");
}

function decodeUtf16Be(bytes: Uint8Array) {
  let output = "";
  for (let index = 0; index + 1 < bytes.length; index += 2) {
    output += String.fromCharCode((bytes[index] << 8) | bytes[index + 1]);
  }
  return output;
}

async function extractOfficeOpenXmlText(file: File, extension: string) {
  const entries = await readZipEntries(file);
  const xmlEntries = entries.filter((entry) => shouldReadOfficeEntry(entry.name, extension));
  const parts: string[] = [];
  for (const entry of xmlEntries.slice(0, 100)) {
    try {
      parts.push(extractTextFromXml(await decodeZipEntry(entry)));
    } catch {
      // Keep extracting other readable document parts.
    }
  }
  return parts.join("\n");
}

function shouldReadOfficeEntry(name: string, extension: string) {
  if (!name.endsWith(".xml")) return false;
  if (extension === "docx") return /^word\/(document|header|footer|footnotes|endnotes)/.test(name);
  if (extension === "pptx") return /^ppt\/(slides|notesSlides)\//.test(name);
  if (extension === "xlsx") return /^xl\/(sharedStrings|worksheets)\//.test(name);
  return false;
}

async function readZipEntries(file: File): Promise<ZipEntry[]> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const eocdOffset = findEndOfCentralDirectory(bytes);
  if (eocdOffset < 0) throw new Error("不是可读取的 OpenXML 压缩文档。");
  const totalEntries = view.getUint16(eocdOffset + 10, true);
  let offset = view.getUint32(eocdOffset + 16, true);
  const decoder = new TextDecoder("utf-8");
  const entries: ZipEntry[] = [];

  for (let index = 0; index < totalEntries; index += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) break;
    const compression = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localHeaderOffset = view.getUint32(offset + 42, true);
    const nameStart = offset + 46;
    const name = decoder.decode(bytes.subarray(nameStart, nameStart + nameLength));
    if (view.getUint32(localHeaderOffset, true) === 0x04034b50) {
      const localNameLength = view.getUint16(localHeaderOffset + 26, true);
      const localExtraLength = view.getUint16(localHeaderOffset + 28, true);
      const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
      entries.push({ name, compression, compressedSize, data: bytes.subarray(dataStart, dataStart + compressedSize) });
    }
    offset = nameStart + nameLength + extraLength + commentLength;
  }
  return entries;
}

function findEndOfCentralDirectory(bytes: Uint8Array) {
  const min = Math.max(0, bytes.length - 66_000);
  for (let offset = bytes.length - 22; offset >= min; offset -= 1) {
    if (bytes[offset] === 0x50 && bytes[offset + 1] === 0x4b && bytes[offset + 2] === 0x05 && bytes[offset + 3] === 0x06) return offset;
  }
  return -1;
}

async function decodeZipEntry(entry: ZipEntry) {
  if (entry.compression === 0) return new TextDecoder("utf-8").decode(entry.data);
  if (entry.compression !== 8) throw new Error(`不支持的压缩方式 ${entry.compression}`);
  for (const format of ["deflate-raw", "deflate"] as const) {
    try {
      const stream = new Blob([toArrayBuffer(entry.data)]).stream();
      const inflated = stream.pipeThrough(new DecompressionStream(format));
      return new TextDecoder("utf-8").decode(await new Response(inflated).arrayBuffer());
    } catch {
      // Try next mode.
    }
  }
  throw new Error("当前浏览器不支持解压该 Office 文档。");
}

function extractTextFromXml(xml: string) {
  const targeted = [
    ...xml.matchAll(/<(?:w:)?t[^>]*>([\s\S]*?)<\/(?:w:)?t>/g),
    ...xml.matchAll(/<(?:a:)?t[^>]*>([\s\S]*?)<\/(?:a:)?t>/g),
    ...xml.matchAll(/<v[^>]*>([\s\S]*?)<\/v>/g),
  ].map((match) => decodeXmlEntities(stripTags(match[1])));
  return targeted.length > 0
    ? targeted.join(" ")
    : [...xml.matchAll(/>([^<>]{2,})</g)].map((match) => decodeXmlEntities(match[1])).join(" ");
}

function assessTextQuality(text: string, kind: DocumentKind, forceAnalyze = false): ParseDiagnostics {
  const extractedLength = text.replace(/\s/g, "").length;
  const metrics = measureTextQuality(text);
  const preview = createPreview(text);
  const base = {
    extractedLength,
    readabilityScore: metrics.readabilityScore,
    chineseRatio: metrics.chineseRatio,
    abnormalCharRatio: metrics.abnormalCharRatio,
    newlineAnomalyScore: metrics.newlineAnomalyScore,
    ocrAvailable,
    preview,
    chunkCount: 0,
  };
  const pdfLooksEmpty = kind === "pdf" && extractedLength === 0;
  const pdfLooksScanned = kind === "pdf" && extractedLength > 0 && extractedLength < minimumReliableLength;
  const needsOcr = pdfLooksEmpty || pdfLooksScanned;

  if (needsOcr) {
    return {
      ...base,
      status: "needs_ocr",
      qualityLevel: "needs_ocr",
      message: "该 PDF 可能是扫描件，当前没有可用文字层，需要 OCR 才能识别。",
      isGarbled: false,
      needsOcr: true,
      ocrStatus: ocrAvailable ? "available" : "not_configured",
      canAnswer: false,
      allowContinue: false,
      requiresUserConfirmation: false,
      nextSuggestion: ocrAvailable
        ? "OCR 已配置，可以进入 OCR 识别流程后重新分析。"
        : "当前 OCR 未配置，扫描版 PDF 暂不能可靠识别。请上传文字版 PDF、Word 文档，或手动复制正文导入。",
    };
  }
  if (extractedLength < minimumReliableLength) {
    return {
      ...base,
      status: "metadata_only",
      qualityLevel: "failed",
      message: "当前文件只有文件名或少量正文线索，尚未完成正文解析，无法进行可靠回答。",
      isGarbled: false,
      needsOcr: false,
      ocrStatus: "not_needed",
      canAnswer: false,
      allowContinue: false,
      requiresUserConfirmation: false,
      nextSuggestion: "请上传包含正文的资料，或手动复制正文导入。",
    };
  }
  if (extractedLength < minimumChunkableLength) {
    return {
      ...base,
      status: "short_text",
      qualityLevel: "mild_anomaly",
      message: "当前只提取到少量文本，可能无法支撑可靠问答，但已允许入库分析。",
      isGarbled: false,
      needsOcr: false,
      ocrStatus: "not_needed",
      canAnswer: true,
      allowContinue: true,
      requiresUserConfirmation: false,
      nextSuggestion: "可以先入库，但建议补充更完整正文以提升问答和星图抽取质量。",
    };
  }

  const severeGarbled =
    metrics.readabilityScore < 30 ||
    metrics.abnormalCharRatio > 0.28 ||
    (metrics.readableRatio < 0.18 && metrics.abnormalCharRatio > 0.12) ||
    (kind === "pdf" && metrics.latin1RunCount > 4 && metrics.chineseRatio < 0.02 && metrics.readableRatio < 0.35);
  if (severeGarbled) {
    return {
      ...base,
      status: "garbled",
      qualityLevel: "severe_garbled",
      message: "正文解析质量过低，暂不能可靠分析。建议上传 Word 版本、文字版 PDF，或开启 OCR。",
      isGarbled: true,
      needsOcr: false,
      ocrStatus: ocrAvailable ? "available" : "not_configured",
      canAnswer: false,
      allowContinue: false,
      requiresUserConfirmation: false,
      nextSuggestion: "请上传 Word 版本、文字版 PDF，或配置 OCR；如果能看懂原文，也可以手动复制正文导入。",
    };
  }

  const moderateAnomaly =
    metrics.readabilityScore < 68 || metrics.abnormalCharRatio > 0.1 || metrics.newlineAnomalyScore > 65 || metrics.mojibakeTokenCount > 16;
  if (moderateAnomaly) {
    return {
      ...base,
      status: "moderate_anomaly",
      qualityLevel: "moderate_anomaly",
      message: forceAnalyze
        ? "已按用户确认继续分析，来源片段将标记为低可信度。"
        : "正文解析质量一般，建议查看预览后决定是否继续分析。",
      isGarbled: false,
      needsOcr: false,
      ocrStatus: "not_needed",
      canAnswer: forceAnalyze,
      allowContinue: true,
      requiresUserConfirmation: !forceAnalyze,
      nextSuggestion: forceAnalyze
        ? "可以进入知源 Copilot 提问，但请优先核对来源片段。"
        : "请先查看正文预览；如果整体可读，可以点击“继续分析”。",
    };
  }

  const mildAnomaly = metrics.readabilityScore < 84 || metrics.abnormalCharRatio > 0.03 || metrics.newlineAnomalyScore > 38 || metrics.mojibakeTokenCount > 4;
  if (mildAnomaly) {
    return {
      ...base,
      status: "mild_anomaly",
      qualityLevel: "mild_anomaly",
      message: "正文存在轻微解析异常，但整体可读，已继续生成片段和知识节点。",
      isGarbled: false,
      needsOcr: false,
      ocrStatus: "not_needed",
      canAnswer: true,
      allowContinue: true,
      requiresUserConfirmation: false,
      nextSuggestion: "可以继续查看星图和来源片段；重要结论建议在 Copilot 中核对原文片段。",
    };
  }

  return {
    ...base,
    status: "parsed",
    qualityLevel: "usable",
    message: "正文解析成功，已切片并可用于可靠问答。",
    isGarbled: false,
    needsOcr: false,
    ocrStatus: "not_needed",
    canAnswer: true,
    allowContinue: true,
    requiresUserConfirmation: false,
    nextSuggestion: "可以查看知识星图，或进入知源 Copilot 基于来源片段提问。",
  };
}

function measureTextQuality(text: string) {
  const sample = text.slice(0, 8000);
  const compactSample = sample.replace(/\s/g, "");
  const compactLength = Math.max(1, compactSample.length);
  const readableCount = (compactSample.match(/[\p{L}\p{N}\u4e00-\u9fa5]/gu) ?? []).length;
  const chineseCount = (compactSample.match(/[\u4e00-\u9fa5]/g) ?? []).length;
  const punctuationCount = (compactSample.match(/[\p{P}\p{S}]/gu) ?? []).length;
  const controlCount = (sample.match(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g) ?? []).length;
  const replacementCount = (sample.match(/\uFFFD|锟斤拷|�|\?{4,}/g) ?? []).length;
  const mojibakeTokenCount = (sample.match(/(?:Ã[\x80-\xBF]|Â[\x80-\xBF]|â[\x80-\xBF]|å[\x80-\xBF]|æ[\x80-\xBF]|ç[\x80-\xBF]|锟斤拷|ï¿½)/g) ?? []).length;
  const latin1RunCount = (sample.match(/[\u00c0-\u00ff]{12,}/g) ?? []).length;
  const readableRatio = readableCount / compactLength;
  const punctuationRatio = punctuationCount / compactLength;
  const symbolOverflow = Math.max(0, punctuationRatio - 0.38);
  const abnormalWeighted = controlCount * 3 + replacementCount * 8 + mojibakeTokenCount * 5 + latin1RunCount * 16 + symbolOverflow * compactLength;
  const abnormalCharRatio = clamp(abnormalWeighted / compactLength, 0, 1);
  const newlineAnomalyScore = computeNewlineAnomalyScore(text);
  const readabilityScore = Math.round(
    clamp(
      100 -
        abnormalCharRatio * 190 -
        Math.max(0, 0.32 - readableRatio) * 130 -
        newlineAnomalyScore * 0.22 -
        Math.min(18, replacementCount * 1.6 + mojibakeTokenCount * 0.9),
      0,
      100,
    ),
  );

  return {
    readabilityScore,
    chineseRatio: roundRatio(chineseCount / Math.max(1, readableCount)),
    abnormalCharRatio: roundRatio(abnormalCharRatio),
    newlineAnomalyScore,
    readableRatio: roundRatio(readableRatio),
    mojibakeTokenCount,
    latin1RunCount,
  };
}

function computeNewlineAnomalyScore(text: string) {
  const lines = text
    .split(/\n/)
    .slice(0, 500)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 8) return 0;
  const shortLineRatio = lines.filter((line) => line.length <= 3).length / lines.length;
  const narrowLineRatio = lines.filter((line) => line.length > 3 && line.length <= 8).length / lines.length;
  const repeatedSpaceRatio = (text.match(/[ \t]{6,}/g) ?? []).length / Math.max(1, lines.length);
  const averageLineLength = lines.reduce((sum, line) => sum + line.length, 0) / lines.length;
  const score = shortLineRatio * 45 + narrowLineRatio * 22 + Math.min(1, repeatedSpaceRatio) * 18 + (averageLineLength < 8 ? 15 : 0);
  return Math.round(clamp(score, 0, 100));
}

function createPreview(text: string) {
  return text.replace(/\s+/g, " ").trim().slice(0, 1000);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundRatio(value: number) {
  return Number(value.toFixed(3));
}

function buildTextChunks(text: string, fileName: string): TextChunk[] {
  const chunkSize = 850;
  const overlap = 120;
  const chunks: TextChunk[] = [];
  let start = 0;
  while (start < text.length && chunks.length < 80) {
    const end = Math.min(text.length, start + chunkSize);
    const chunkText = text.slice(start, end).trim();
    if (chunkText) {
      chunks.push({
        id: `${slug(fileName)}-chunk-${chunks.length + 1}`,
        index: chunks.length,
        text: chunkText,
        start,
        end,
      });
    }
    if (end >= text.length) break;
    start = Math.max(0, end - overlap);
  }
  return chunks;
}

function normalizeContent(content: string) {
  return content
    .replace(/\u0000/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 60_000);
}

function stripTags(value: string) {
  return value.replace(/<[^>]+>/g, " ");
}

function stripRtf(value: string) {
  return value.replace(/\\'[0-9a-fA-F]{2}/g, " ").replace(/\\[a-z]+-?\d* ?/g, " ").replace(/[{}]/g, " ");
}

function decodeXmlEntities(value: string) {
  return value.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&apos;/g, "'");
}

function toArrayBuffer(data: Uint8Array) {
  const buffer = new ArrayBuffer(data.byteLength);
  new Uint8Array(buffer).set(data);
  return buffer;
}

function slug(input: string) {
  return input.trim().toLowerCase().replace(/[\s_]+/g, "-").replace(/[^a-z0-9\u4e00-\u9fa5-]+/g, "").slice(0, 42) || "document";
}
