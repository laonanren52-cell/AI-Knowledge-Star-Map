import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from "react";
import { mockDocuments } from "../data/mockDocuments";
import { mockGraphData } from "../data/mockGraphData";
import type { GeneratedOutput } from "../types/ai";
import type { KnowledgeDocument, ParsedDocument, ParseDiagnostics, TextChunk } from "../types/document";
import type { AnalysisResult, GraphData, GraphEdge, GraphNode, GraphNodeType, SourceReference } from "../types/graph";

const STORAGE_KEY = "zhimai-ai-knowledge-store-v5";
const LEGACY_STORAGE_KEYS = ["zhimai-ai-knowledge-store-v4", "zhimai-ai-knowledge-store-v3"];

export type ActivityType = "upload" | "ask" | "generate" | "delete" | "clear" | "reorganize";
export type RecommendationAction = "upload" | "graph" | "assistant" | "outputs";

export interface RecentActivity {
  id: string;
  type: ActivityType;
  title: string;
  detail: string;
  createdAt: string;
  documentId?: string;
  nodeIds?: string[];
  outputId?: string;
}

export interface AIRecommendation {
  id: string;
  title: string;
  detail: string;
  action: RecommendationAction;
}

export interface CopilotContext {
  nodeId?: string;
  nodeLabel?: string;
  nodeType?: GraphNodeType;
  summary?: string;
  relatedDocumentIds?: string[];
  sourceSnippets?: SourceReference[];
  neighborLabels?: string[];
  intent?: "ask" | "summary" | "generate" | "analyze" | "web";
  answerMode?: "library" | "web" | "hybrid";
}

export interface KnowledgeState {
  documents: KnowledgeDocument[];
  graph: GraphData;
  outputs: GeneratedOutput[];
  recentActivities: RecentActivity[];
  recommendations: AIRecommendation[];
  highlightedNodeIds: string[];
  copilotContext: CopilotContext | null;
  revision: number;
}

type KnowledgeAction =
  | { type: "ingestAnalysis"; file: File; content: string; analysis: AnalysisResult; parsed?: ParsedDocument }
  | { type: "deleteNode"; nodeId: string }
  | { type: "deleteDocument"; documentId: string }
  | { type: "clearGraph" }
  | { type: "resetDemo" }
  | { type: "addOutput"; output: GeneratedOutput; relatedNodeId?: string | null; nodeType?: "output" | "problem" | "concept" | "tag" }
  | { type: "setCopilotContext"; context: CopilotContext | null }
  | { type: "recordAsk"; question: string };

interface KnowledgeContextValue {
  state: KnowledgeState;
  ingestAnalysis: (file: File, content: string, analysis: AnalysisResult, parsed?: ParsedDocument) => void;
  deleteNode: (nodeId: string) => void;
  deleteDocument: (documentId: string) => void;
  clearGraph: () => void;
  resetDemo: () => void;
  addOutput: (output: GeneratedOutput, relatedNodeId?: string | null, nodeType?: "output" | "problem" | "concept" | "tag") => void;
  setCopilotContext: (context: CopilotContext | null) => void;
  recordAsk: (question: string) => void;
}

const KnowledgeContext = createContext<KnowledgeContextValue | null>(null);

function nowIso() {
  return new Date().toISOString();
}

function slug(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9\u4e00-\u9fa5-]+/g, "")
    .replace(/-+/g, "-")
    .slice(0, 46);
}

function sizeLabel(size: number) {
  if (size > 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
  if (size > 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${size} B`;
}

function fileKind(fileName: string): KnowledgeDocument["kind"] {
  const extension = fileName.split(".").pop()?.toLowerCase();
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

function formatDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function uniqueById<T extends { id: string }>(items: T[]) {
  const map = new Map<string, T>();
  items.forEach((item) => map.set(item.id, item));
  return [...map.values()];
}

function compactGraph(graph: GraphData): GraphData {
  const nodes = uniqueById(graph.nodes);
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = uniqueById(graph.edges).filter((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to) && edge.from !== edge.to);
  return { nodes: reorganizeNodes(nodes), edges };
}

function reorganizeNodes(nodes: GraphNode[]) {
  const groups = new Map<string, GraphNode[]>();
  nodes.forEach((node) => {
    const group = node.group || node.cluster || "default";
    groups.set(group, [...(groups.get(group) ?? []), node]);
  });
  const centers = [...groups.keys()].map((group, index, list) => {
    const angle = (Math.PI * 2 * index) / Math.max(1, list.length);
    const radius = list.length <= 1 ? 0 : 420;
    return { group, x: Math.round(Math.cos(angle) * radius), y: Math.round(Math.sin(angle) * radius) };
  });
  const centerMap = new Map(centers.map((center) => [center.group, center]));

  return nodes.map((node, index) => {
    const group = node.group || node.cluster || "default";
    const siblings = groups.get(group) ?? [];
    const siblingIndex = siblings.findIndex((item) => item.id === node.id);
    const center = centerMap.get(group) ?? { x: 0, y: 0 };
    const angle = (Math.PI * 2 * siblingIndex) / Math.max(1, siblings.length) + 0.42;
    const ring = node.type === "project" ? 0 : node.type === "document" ? 1 : 2 + (siblingIndex % 2);
    const radius = node.type === "project" ? 0 : 90 + ring * 46 + ((index * 17) % 28);
    return {
      ...node,
      group,
      cluster: node.cluster || group,
      x: node.x ?? Math.round(center.x + Math.cos(angle) * radius),
      y: node.y ?? Math.round(center.y + Math.sin(angle) * radius),
    };
  });
}

function fallbackDiagnostics(content: string): ParseDiagnostics {
  const canAnswer = content.trim().length >= 40;
  const extractedLength = content.replace(/\s/g, "").length;
  return {
    status: canAnswer ? (extractedLength < 120 ? "short_text" : "parsed") : "metadata_only",
    qualityLevel: canAnswer ? (extractedLength < 120 ? "mild_anomaly" : "usable") : "failed",
    message: canAnswer
      ? extractedLength < 120
        ? "当前只提取到少量文本，可能无法支撑可靠问答。"
        : "正文解析成功，已切片并可用于可靠问答。"
      : "当前文件只有文件名，尚未完成正文解析，无法进行可靠回答。",
    extractedLength,
    readabilityScore: canAnswer ? 100 : 0,
    chineseRatio: 0,
    abnormalCharRatio: 0,
    newlineAnomalyScore: 0,
    isGarbled: false,
    needsOcr: false,
    ocrAvailable: false,
    ocrStatus: "not_needed",
    chunkCount: canAnswer ? 1 : 0,
    canAnswer,
    allowContinue: canAnswer,
    requiresUserConfirmation: false,
    preview: content.trim().slice(0, 1000),
    nextSuggestion: canAnswer ? "可以进入知源 Copilot 基于来源片段提问。" : "请上传包含正文的资料，或手动复制正文导入。",
  };
}

function buildFallbackChunks(documentId: string, content: string): TextChunk[] {
  const text = content.trim();
  if (text.length < 40) return [];
  return [
    {
      id: `${documentId}-chunk-1`,
      index: 0,
      text: text.slice(0, 850),
      start: 0,
      end: Math.min(text.length, 850),
    },
  ];
}

function normalizeDocument(document: KnowledgeDocument): KnowledgeDocument {
  const diagnostics = fallbackDiagnostics(document.sourceText || document.summary || "");
  const chunks = document.chunks?.length ? document.chunks : buildFallbackChunks(document.id, document.sourceText || "");
  return {
    ...document,
    kind: document.kind ?? "unknown",
    parseStatus: document.parseStatus ?? diagnostics.status,
    parseMessage: document.parseMessage ?? diagnostics.message,
    extractedLength: document.extractedLength ?? diagnostics.extractedLength,
    isGarbled: document.isGarbled ?? diagnostics.isGarbled,
    needsOcr: document.needsOcr ?? diagnostics.needsOcr,
    canAnswer: document.canAnswer ?? diagnostics.canAnswer,
    chunks,
  };
}

function makeDocumentFromAnalysis(file: File, content: string, analysis: AnalysisResult, parsed?: ParsedDocument): KnowledgeDocument {
  const stamp = Date.now();
  const id = `user-doc-${stamp}-${slug(file.name) || "upload"}`;
  const diagnostics = parsed?.diagnostics ?? analysis.parsing ?? fallbackDiagnostics(content);
  const chunks = (parsed?.chunks ?? buildFallbackChunks(id, content)).map((chunk) => ({ ...chunk, id: chunk.id || `${id}-chunk-${chunk.index + 1}` }));
  const confidence = confidenceForDiagnostics(analysis.confidence, diagnostics);
  return {
    id,
    title: file.name,
    kind: parsed?.kind ?? fileKind(file.name),
    sizeLabel: sizeLabel(file.size),
    uploadedAt: formatDate(),
    summary: analysis.summary,
    keywords: analysis.keywords,
    sourceText: diagnostics.canAnswer ? content.slice(0, 12_000) : "",
    confidence,
    parseStatus: diagnostics.status,
    parseMessage: diagnostics.message,
    extractedLength: diagnostics.extractedLength,
    isGarbled: diagnostics.isGarbled,
    needsOcr: diagnostics.needsOcr,
    canAnswer: diagnostics.canAnswer,
    chunks,
  };
}

function confidenceForDiagnostics(baseConfidence: number, diagnostics: ParseDiagnostics) {
  if (!diagnostics.canAnswer) return Math.min(baseConfidence, 0.24);
  if (diagnostics.status === "moderate_anomaly") return Math.min(Number((baseConfidence * 0.58).toFixed(2)), 0.56);
  if (diagnostics.status === "mild_anomaly" || diagnostics.status === "short_text") return Math.min(Number((baseConfidence * 0.82).toFixed(2)), 0.78);
  return baseConfidence;
}

function sanitizeImportedGraph(document: KnowledgeDocument, analysis: AnalysisResult) {
  const group = `upload-${slug(document.title) || Date.now()}`;
  const docNodeId = `node-${document.id}`;
  const documentNode: GraphNode = {
    id: docNodeId,
    label: document.title.replace(/\.[^.]+$/, ""),
    type: "document",
    group,
    cluster: group,
    description: document.canAnswer ? analysis.summary : document.parseMessage,
    sourceDocumentIds: [document.id],
    value: document.canAnswer ? 22 : 12,
    confidence: document.confidence,
  };

  const importedNodes = analysis.entities.map((node, index) => ({
    ...node,
    id: node.id || `node-${document.id}-${index}`,
    group: node.group?.startsWith("upload-") ? node.group : group,
    cluster: node.cluster?.startsWith("upload-") ? node.cluster : group,
    sourceDocumentIds: [...new Set([...(node.sourceDocumentIds ?? []), document.id])],
    description: node.description || `${node.label} 来自 ${document.title} 的 AI 解析结果。`,
    confidence: Math.min(node.confidence ?? analysis.confidence, document.confidence),
  }));
  const nodes = uniqueById([documentNode, ...importedNodes]);
  const nodeIds = new Set(nodes.map((node) => node.id));
  const relations = analysis.relations
    .filter((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to))
    .map((edge, index) => ({
      ...edge,
      id: edge.id || `edge-${document.id}-${index}`,
      confidence: Math.min(edge.confidence ?? analysis.confidence, document.confidence),
      evidence: edge.evidence || analysis.summary,
    }));
  const docEdges = importedNodes.slice(0, 18).map<GraphEdge>((node, index) => ({
    id: `edge-${docNodeId}-${node.id}`.replace(/[^a-zA-Z0-9-]/g, "-"),
    from: docNodeId,
    to: node.id,
    label: index === 0 ? "主题" : "提到",
    relationType: index === 0 ? "belongs_to" : "mentions",
    weight: index === 0 ? 0.95 : 0.62,
    confidence: document.confidence,
    evidence: document.canAnswer ? (document.chunks[index % Math.max(1, document.chunks.length)]?.text ?? analysis.summary) : document.parseMessage,
  }));
  return { nodes, edges: uniqueById([...relations, ...docEdges]), highlightedNodeIds: nodes.map((node) => node.id) };
}

function mergeGraphs(base: GraphData, incoming: GraphData): GraphData {
  const nodeMap = new Map(base.nodes.map((node) => [node.id, node]));
  incoming.nodes.forEach((node) => {
    const existing = nodeMap.get(node.id);
    if (!existing) {
      nodeMap.set(node.id, node);
      return;
    }
    nodeMap.set(node.id, {
      ...existing,
      ...node,
      sourceDocumentIds: [...new Set([...(existing.sourceDocumentIds ?? []), ...(node.sourceDocumentIds ?? [])])],
    });
  });
  return compactGraph({ nodes: [...nodeMap.values()], edges: uniqueById([...base.edges, ...incoming.edges]) });
}

function recommendationsFor(state: Pick<KnowledgeState, "documents" | "graph" | "outputs">): AIRecommendation[] {
  const latest = state.documents[0];
  if (!latest) {
    return [
      { id: "rec-upload-first", title: "导入第一份资料", detail: "上传 PDF、Word、笔记或项目资料，先生成可追溯知识星图。", action: "upload" },
      { id: "rec-open-graph", title: "查看知识星图", detail: "熟悉节点、关系和来源引用如何联动。", action: "graph" },
    ];
  }
  const base = latest.canAnswer
    ? `最近资料「${latest.title}」已有 ${latest.chunks.length} 个可问答片段。`
    : `最近资料「${latest.title}」正文不可用于可靠问答，需要重新解析或 OCR。`;
  return [
    { id: "rec-ask-latest", title: "基于最近资料提问", detail: base, action: "assistant" },
    { id: "rec-check-source", title: "检查来源片段", detail: "在星图中查看资料节点、相邻节点和引用片段是否完整。", action: "graph" },
    { id: "rec-generate-output", title: "沉淀一个成果节点", detail: "把稳定结论保存为成果、总结或问题节点，回写到星图。", action: "outputs" },
  ];
}

function buildInitialActivities(): RecentActivity[] {
  return mockDocuments.slice(0, 4).map((document, index) => ({
    id: `activity-demo-${document.id}`,
    type: "upload",
    title: `已入库：${document.title}`,
    detail: document.summary,
    createdAt: new Date(Date.now() - (4 - index) * 3600_000).toISOString(),
    documentId: document.id,
  }));
}

function createInitialState(): KnowledgeState {
  const base: Omit<KnowledgeState, "recommendations"> = {
    documents: [],
    graph: { nodes: [], edges: [] },
    outputs: [],
    recentActivities: [],
    highlightedNodeIds: [],
    copilotContext: null,
    revision: 0,
  };
  return { ...base, recommendations: recommendationsFor(base) };
}

function createDemoState(): KnowledgeState {
  const documents = mockDocuments.map(normalizeDocument).reverse();
  const base: Omit<KnowledgeState, "recommendations"> = {
    documents,
    graph: compactGraph(mockGraphData),
    outputs: [],
    recentActivities: buildInitialActivities(),
    highlightedNodeIds: [],
    copilotContext: null,
    revision: 0,
  };
  return { ...base, recommendations: recommendationsFor(base) };
}

function reviveState(value: KnowledgeState): KnowledgeState {
  const base = {
    documents: (value.documents ?? []).map(normalizeDocument),
    graph: compactGraph(value.graph ?? { nodes: [], edges: [] }),
    outputs: value.outputs ?? [],
    recentActivities: value.recentActivities ?? [],
    highlightedNodeIds: value.highlightedNodeIds ?? [],
    copilotContext: value.copilotContext ?? null,
    revision: value.revision ?? 0,
  };
  return { ...base, recommendations: recommendationsFor(base) };
}

function addActivity(state: KnowledgeState, activity: Omit<RecentActivity, "id" | "createdAt">): RecentActivity[] {
  return [{ ...activity, id: `activity-${activity.type}-${Date.now()}`, createdAt: nowIso() }, ...state.recentActivities].slice(0, 20);
}

function withRecommendations(state: KnowledgeState): KnowledgeState {
  return { ...state, recommendations: recommendationsFor(state), revision: state.revision + 1 };
}

function knowledgeReducer(state: KnowledgeState, action: KnowledgeAction): KnowledgeState {
  if (action.type === "ingestAnalysis") {
    const document = makeDocumentFromAnalysis(action.file, action.content, action.analysis, action.parsed);
    const imported = sanitizeImportedGraph(document, action.analysis);
    const nextState: KnowledgeState = {
      ...state,
      documents: [document, ...state.documents.filter((item) => item.id !== document.id)],
      graph: mergeGraphs(state.graph, imported),
      highlightedNodeIds: imported.highlightedNodeIds,
      recentActivities: addActivity(state, {
        type: "upload",
        title: document.canAnswer ? `已解析资料：${document.title}` : `已入库但不可问答：${document.title}`,
        detail: document.canAnswer
          ? `正文长度 ${document.extractedLength}，可问答片段 ${document.chunks.length}，新增 ${imported.nodes.length} 个节点。`
          : document.parseMessage,
        documentId: document.id,
        nodeIds: imported.highlightedNodeIds,
      }),
    };
    return withRecommendations(nextState);
  }

  if (action.type === "deleteNode") {
    const target = state.graph.nodes.find((node) => node.id === action.nodeId);
    if (!target) return state;
    return withRecommendations({
      ...state,
      graph: compactGraph({
        nodes: state.graph.nodes.filter((node) => node.id !== action.nodeId),
        edges: state.graph.edges.filter((edge) => edge.from !== action.nodeId && edge.to !== action.nodeId),
      }),
      highlightedNodeIds: [],
      copilotContext: state.copilotContext?.nodeId === action.nodeId ? null : state.copilotContext,
      recentActivities: addActivity(state, { type: "delete", title: `已删除节点：${target.label}`, detail: "相关关系边已同步清理。", nodeIds: [action.nodeId] }),
    });
  }

  if (action.type === "deleteDocument") {
    const document = state.documents.find((item) => item.id === action.documentId);
    if (!document) return state;
    const keptNodes = state.graph.nodes
      .map((node) => {
        if (!node.sourceDocumentIds?.includes(action.documentId)) return node;
        const rest = node.sourceDocumentIds.filter((id) => id !== action.documentId);
        if (node.type === "document" || rest.length === 0) return null;
        return { ...node, sourceDocumentIds: rest };
      })
      .filter((node): node is GraphNode => Boolean(node));
    const keptNodeIds = new Set(keptNodes.map((node) => node.id));
    return withRecommendations({
      ...state,
      documents: state.documents.filter((item) => item.id !== action.documentId),
      graph: compactGraph({ nodes: keptNodes, edges: state.graph.edges.filter((edge) => keptNodeIds.has(edge.from) && keptNodeIds.has(edge.to)) }),
      highlightedNodeIds: [],
      copilotContext: state.copilotContext?.relatedDocumentIds?.includes(action.documentId) ? null : state.copilotContext,
      recentActivities: addActivity(state, { type: "delete", title: `已删除资料：${document.title}`, detail: "该资料产生的文档节点与专属关系已清理。", documentId: action.documentId }),
    });
  }

  if (action.type === "clearGraph") {
    return withRecommendations({
      ...state,
      documents: [],
      graph: { nodes: [], edges: [] },
      outputs: [],
      highlightedNodeIds: [],
      copilotContext: null,
      recentActivities: [{ id: `activity-clear-${Date.now()}`, type: "clear", title: "已清空知识星图", detail: "资料、节点、关系和成果已清空，可重新导入第一份资料。", createdAt: nowIso() }],
    });
  }

  if (action.type === "resetDemo") return createDemoState();

  if (action.type === "addOutput") {
    const relatedNode = action.relatedNodeId
      ? state.graph.nodes.find((node) => node.id === action.relatedNodeId)
      : state.copilotContext?.nodeId
        ? state.graph.nodes.find((node) => node.id === state.copilotContext?.nodeId)
        : null;
    const sourceDocumentIds = action.output.sources.filter((source) => source.sourceType !== "web").map((source) => source.documentId);
    const outputNode: GraphNode = {
      id: `output-node-${action.output.id}`,
      label: action.output.title,
      type: action.nodeType ?? "output",
      group: relatedNode?.group ?? "outputs",
      cluster: relatedNode?.cluster ?? "outputs",
      description: action.output.body.slice(0, 180),
      sourceDocumentIds,
      value: 18,
      confidence: 0.86,
    };
    const edge: GraphEdge | null = relatedNode
      ? {
          id: `edge-${relatedNode.id}-${outputNode.id}`.replace(/[^a-zA-Z0-9-]/g, "-"),
          from: relatedNode.id,
          to: outputNode.id,
          label: "生成",
          relationType: "generates",
          weight: 0.82,
          confidence: 0.86,
          evidence: "由知源 Copilot 基于当前节点和来源片段生成。",
        }
      : null;
    return withRecommendations({
      ...state,
      outputs: [action.output, ...state.outputs.filter((item) => item.id !== action.output.id)],
      graph: mergeGraphs(state.graph, { nodes: [outputNode], edges: edge ? [edge] : [] }),
      highlightedNodeIds: [outputNode.id],
      recentActivities: addActivity(state, { type: "generate", title: `已保存成果：${action.output.title}`, detail: "成果已挂载为星图节点。", outputId: action.output.id, nodeIds: [outputNode.id] }),
    });
  }

  if (action.type === "setCopilotContext") return { ...state, copilotContext: action.context };

  if (action.type === "recordAsk") {
    return withRecommendations({ ...state, recentActivities: addActivity(state, { type: "ask", title: "知源 Copilot 问答", detail: action.question }) });
  }

  return state;
}

function loadInitialState() {
  if (typeof window === "undefined") return createInitialState();
  try {
    const keys = [STORAGE_KEY, ...LEGACY_STORAGE_KEYS];
    for (const key of keys) {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      return reviveState(JSON.parse(raw) as KnowledgeState);
    }
    return createInitialState();
  } catch {
    return createInitialState();
  }
}

export function KnowledgeProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(knowledgeReducer, undefined, loadInitialState);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const value = useMemo<KnowledgeContextValue>(
    () => ({
      state,
      ingestAnalysis: (file, content, analysis, parsed) => dispatch({ type: "ingestAnalysis", file, content, analysis, parsed }),
      deleteNode: (nodeId) => dispatch({ type: "deleteNode", nodeId }),
      deleteDocument: (documentId) => dispatch({ type: "deleteDocument", documentId }),
      clearGraph: () => dispatch({ type: "clearGraph" }),
      resetDemo: () => dispatch({ type: "resetDemo" }),
      addOutput: (output, relatedNodeId, nodeType) => dispatch({ type: "addOutput", output, relatedNodeId, nodeType }),
      setCopilotContext: (context) => dispatch({ type: "setCopilotContext", context }),
      recordAsk: (question) => dispatch({ type: "recordAsk", question }),
    }),
    [state],
  );

  return <KnowledgeContext.Provider value={value}>{children}</KnowledgeContext.Provider>;
}

export function useKnowledgeStore() {
  const context = useContext(KnowledgeContext);
  if (!context) throw new Error("useKnowledgeStore must be used inside KnowledgeProvider.");
  return context;
}
