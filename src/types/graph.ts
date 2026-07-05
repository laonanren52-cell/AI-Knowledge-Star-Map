import type { ParseDiagnostics } from "./document";

export type GraphNodeType =
  | "project"
  | "document"
  | "tech"
  | "problem"
  | "output"
  | "tag"
  | "concept";

export type GraphRelationType =
  | "mentions"
  | "belongs_to"
  | "uses"
  | "depends_on"
  | "solves"
  | "generates"
  | "related_to";

export interface GraphNode {
  id: string;
  workspaceId?: string;
  label: string;
  type: GraphNodeType;
  group: string;
  description?: string;
  sourceDocumentIds?: string[];
  value?: number;
  confidence?: number;
  cluster?: string;
  x?: number;
  y?: number;
  analysisProvider?: string;
  analysisSourceStatus?: "api" | "mock" | "local_rule";
  analyzedAt?: string;
}

export interface GraphEdge {
  id: string;
  workspaceId?: string;
  from: string;
  to: string;
  label?: string;
  relationType: GraphRelationType;
  weight?: number;
  confidence?: number;
  evidence?: string;
  analysisProvider?: string;
  analysisSourceStatus?: "api" | "mock" | "local_rule";
  analyzedAt?: string;
}

export interface SourceReference {
  sourceType?: "local" | "web";
  workspaceId?: string;
  documentId: string;
  documentTitle: string;
  snippet: string;
  score?: number;
  nodeId?: string;
  nodeLabel?: string;
  chunkId?: string;
  isParsed?: boolean;
  siteName?: string;
  url?: string;
  retrievedAt?: string;
}

export interface AnalysisResult {
  title: string;
  type: string;
  summary: string;
  keywords: string[];
  entities: GraphNode[];
  relations: GraphEdge[];
  outputs: string[];
  sources: SourceReference[];
  confidence: number;
  parsing?: ParseDiagnostics;
  provider?: string;
  sourceStatus?: "api" | "mock" | "local_rule";
  analyzedAt?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface NodeTypeMeta {
  label: string;
  color: string;
  glow: string;
}
