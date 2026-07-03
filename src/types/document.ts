export type DocumentKind =
  | "txt"
  | "md"
  | "pdf"
  | "docx"
  | "pptx"
  | "xlsx"
  | "csv"
  | "json"
  | "html"
  | "project"
  | "note"
  | "unknown";

export type ParseStatus =
  | "parsed"
  | "mild_anomaly"
  | "moderate_anomaly"
  | "short_text"
  | "metadata_only"
  | "needs_ocr"
  | "garbled"
  | "failed";
export type TextQualityLevel = "usable" | "mild_anomaly" | "moderate_anomaly" | "severe_garbled" | "needs_ocr" | "failed";
export type OcrStatus = "available" | "not_configured" | "not_needed" | "failed";

export interface TextChunk {
  id: string;
  index: number;
  text: string;
  start: number;
  end: number;
  nodeId?: string;
  nodeLabel?: string;
}

export interface ParseDiagnostics {
  status: ParseStatus;
  qualityLevel: TextQualityLevel;
  message: string;
  extractedLength: number;
  readabilityScore: number;
  chineseRatio: number;
  abnormalCharRatio: number;
  newlineAnomalyScore: number;
  isGarbled: boolean;
  needsOcr: boolean;
  ocrAvailable: boolean;
  ocrStatus: OcrStatus;
  encoding?: string;
  chunkCount: number;
  canAnswer: boolean;
  allowContinue: boolean;
  requiresUserConfirmation: boolean;
  preview: string;
  nextSuggestion: string;
}

export interface ParsedDocument {
  text: string;
  kind: DocumentKind;
  diagnostics: ParseDiagnostics;
  chunks: TextChunk[];
}

export interface KnowledgeDocument {
  id: string;
  title: string;
  kind: DocumentKind;
  sizeLabel: string;
  uploadedAt: string;
  summary: string;
  keywords: string[];
  sourceText: string;
  confidence: number;
  parseStatus: ParseStatus;
  parseMessage: string;
  extractedLength: number;
  isGarbled: boolean;
  needsOcr: boolean;
  canAnswer: boolean;
  chunks: TextChunk[];
}

export interface UploadValidationResult {
  ok: boolean;
  message?: string;
}
