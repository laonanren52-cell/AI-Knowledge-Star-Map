import type { AnalysisResult, SourceReference } from "./graph";

export type AnswerMode = "library" | "web" | "hybrid";
export type AiSourceStatus = "api" | "mock" | "local_rule";

export interface WebSourceReference {
  title: string;
  siteName: string;
  url: string;
  snippet: string;
  retrievedAt: string;
  relevance?: number;
}

export interface QAResult {
  answer: string;
  sources: SourceReference[];
  webSources?: WebSourceReference[];
  confidence: number;
  mode?: AnswerMode;
  warnings?: string[];
  sourceStatus?: AiSourceStatus;
}

export type GeneratedOutputType =
  | "resume"
  | "defense"
  | "ppt"
  | "interview"
  | "review"
  | "summary";

export interface GeneratedOutput {
  id: string;
  workspaceId?: string;
  type: GeneratedOutputType;
  title: string;
  content?: string;
  body: string;
  sources: SourceReference[];
  createdAt: string;
  sourceStatus?: AiSourceStatus;
}

export interface AIProvider {
  analyzeDocument(content: string, fileName?: string): Promise<AnalysisResult>;
  generateGraph(analysisResult: AnalysisResult): Promise<{
    nodes: AnalysisResult["entities"];
    edges: AnalysisResult["relations"];
  }>;
  askWithSources(question: string): Promise<QAResult>;
  generateOutput(type: GeneratedOutputType, context?: unknown): Promise<GeneratedOutput>;
}
