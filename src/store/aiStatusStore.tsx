import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type ReactNode } from "react";
import { getBackendAiHealth, getClientAiConfig, type BackendHealth } from "../services/aiService";
import { useKnowledgeStore } from "./knowledgeStore";

export type AiConnectionState = "mock" | "checking" | "connected" | "degraded" | "offline";
export type AiStatusTone = "success" | "warning" | "danger" | "neutral";

interface RuntimeState {
  backend: BackendHealth | null;
  connection: AiConnectionState;
  lastSuccessAt: string | null;
  lastFailedAt: string | null;
  lastError: string | null;
  lastOperation: string | null;
}

export interface AiRuntimeStatus extends RuntimeState {
  provider: string;
  providerLabel: string;
  model: string;
  isMockMode: boolean;
  searchEnabled: boolean;
  searchConfigured: boolean;
  searchProvider: string;
  ocrEnabled: boolean;
  ocrConfigured: boolean;
  totalDocuments: number;
  usableDocuments: number;
  chunkCount: number;
  nodeCount: number;
  edgeCount: number;
  summary: string;
  detail: string;
  tone: AiStatusTone;
}

interface AiStatusContextValue {
  status: AiRuntimeStatus;
  refreshHealth: () => Promise<void>;
  markAiSuccess: (operation: string) => void;
  markAiFailure: (operation: string, error: unknown) => void;
  clearAiError: () => void;
}

type AiStatusAction =
  | { type: "checking" }
  | { type: "healthSuccess"; backend: BackendHealth }
  | { type: "healthFailure"; error: string }
  | { type: "success"; operation: string }
  | { type: "failure"; operation: string; error: string }
  | { type: "clearError" }
  | { type: "resetWorkspace" };

const AiStatusContext = createContext<AiStatusContextValue | null>(null);

function nowIso() {
  return new Date().toISOString();
}

function initialState(): RuntimeState {
  const client = getClientAiConfig();
  return {
    backend: null,
    connection: client.provider === "api" ? "checking" : "mock",
    lastSuccessAt: null,
    lastFailedAt: null,
    lastError: null,
    lastOperation: null,
  };
}

function aiStatusReducer(state: RuntimeState, action: AiStatusAction): RuntimeState {
  if (action.type === "checking") {
    return { ...state, connection: "checking" };
  }
  if (action.type === "healthSuccess") {
    const connection: AiConnectionState = action.backend.ok ? (action.backend.provider === "mock" ? "degraded" : "connected") : "offline";
    return {
      ...state,
      backend: action.backend,
      connection,
      lastError: null,
    };
  }
  if (action.type === "healthFailure") {
    return { ...state, backend: null, connection: "offline", lastError: action.error, lastFailedAt: nowIso(), lastOperation: "health" };
  }
  if (action.type === "success") {
    const client = getClientAiConfig();
    return {
      ...state,
      connection: client.provider === "api" ? (state.backend?.provider === "mock" ? "degraded" : "connected") : "mock",
      lastSuccessAt: nowIso(),
      lastError: null,
      lastOperation: action.operation,
    };
  }
  if (action.type === "failure") {
    return {
      ...state,
      connection: state.connection === "connected" || state.connection === "degraded" ? "degraded" : state.connection,
      lastFailedAt: nowIso(),
      lastError: action.error,
      lastOperation: action.operation,
    };
  }
  if (action.type === "clearError") {
    return { ...state, lastError: null };
  }
  if (action.type === "resetWorkspace") {
    return { ...state, lastError: null, lastFailedAt: null, lastOperation: null };
  }
  return state;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error || "AI 请求失败");
}

function statusTone(connection: AiConnectionState): AiStatusTone {
  if (connection === "connected") return "success";
  if (connection === "offline") return "danger";
  if (connection === "checking") return "neutral";
  return "warning";
}

function providerLabel(clientProvider: string, backend: BackendHealth | null) {
  if (clientProvider !== "api") return "Mock 演示模式";
  if (!backend) return "API 代理检测中";
  if (backend.provider === "mock") return "后端 Mock 演示";
  return `${backend.provider} · ${backend.model}`;
}

function summaryFor(status: Pick<AiRuntimeStatus, "connection" | "providerLabel" | "lastError" | "chunkCount" | "usableDocuments">) {
  if (status.connection === "connected") return `AI 已连接 · ${status.providerLabel}`;
  if (status.connection === "checking") return "AI 代理检测中";
  if (status.connection === "offline") return "AI 代理未连接";
  if (status.connection === "mock") return "Mock 演示模式";
  if (status.providerLabel.includes("Mock")) return "后端未配置真实模型，使用 Mock 演示";
  return status.lastError ? "AI 可用，但最近一次请求失败" : "AI 可用，部分能力未配置";
}

export function AiStatusProvider({ children }: { children: ReactNode }) {
  const { state } = useKnowledgeStore();
  const [runtime, dispatch] = useReducer(aiStatusReducer, undefined, initialState);
  const client = getClientAiConfig();

  const refreshHealth = useCallback(async () => {
    if (client.provider !== "api") {
      dispatch({ type: "clearError" });
      return;
    }
    dispatch({ type: "checking" });
    try {
      const backend = await getBackendAiHealth();
      dispatch({ type: "healthSuccess", backend });
    } catch (error) {
      dispatch({ type: "healthFailure", error: errorMessage(error) });
    }
  }, [client.provider]);

  useEffect(() => {
    dispatch({ type: "resetWorkspace" });
    void refreshHealth();
  }, [refreshHealth, state.workspaceId]);

  const status = useMemo<AiRuntimeStatus>(() => {
    const usableDocuments = state.documents.filter((document) => document.canAnswer).length;
    const chunkCount = state.documents.reduce((sum, document) => sum + (document.canAnswer ? document.chunks.length : 0), 0);
    const provider = client.provider;
    const backend = runtime.backend;
    const connection = provider === "api" ? runtime.connection : "mock";
    const model = provider === "api" ? (backend?.model ?? "pending") : "mock";
    const searchEnabled = Boolean(backend?.search?.enabled);
    const searchConfigured = Boolean(backend?.search?.configured ?? backend?.search?.enabled);
    const ocrEnabled = Boolean(backend?.ocr?.enabled);
    const ocrConfigured = Boolean(backend?.ocr?.configured ?? backend?.ocr?.enabled);
    const next: AiRuntimeStatus = {
      ...runtime,
      connection,
      provider,
      providerLabel: providerLabel(provider, backend),
      model,
      isMockMode: provider !== "api" || backend?.provider === "mock",
      searchEnabled,
      searchConfigured,
      searchProvider: backend?.search?.provider ?? "none",
      ocrEnabled,
      ocrConfigured,
      totalDocuments: state.documents.length,
      usableDocuments,
      chunkCount,
      nodeCount: state.graph.nodes.length,
      edgeCount: state.graph.edges.length,
      summary: "",
      detail: "",
      tone: statusTone(connection),
    };
    next.summary = summaryFor(next);
    next.detail =
      connection === "connected"
        ? `${usableDocuments}/${state.documents.length} 份资料可问答，${chunkCount} 个来源片段`
        : runtime.lastError ||
          (connection === "mock" || backend?.provider === "mock"
            ? "未配置真实模型时仍可演示完整链路"
            : "搜索 / OCR 未配置不会影响本地资料问答");
    return next;
  }, [client.provider, runtime, state.documents, state.graph.edges.length, state.graph.nodes.length]);

  const value = useMemo<AiStatusContextValue>(
    () => ({
      status,
      refreshHealth,
      markAiSuccess: (operation) => dispatch({ type: "success", operation }),
      markAiFailure: (operation, error) => dispatch({ type: "failure", operation, error: errorMessage(error) }),
      clearAiError: () => dispatch({ type: "clearError" }),
    }),
    [refreshHealth, status],
  );

  return <AiStatusContext.Provider value={value}>{children}</AiStatusContext.Provider>;
}

export function useAiStatus() {
  const context = useContext(AiStatusContext);
  if (!context) throw new Error("useAiStatus must be used inside AiStatusProvider.");
  return context;
}
