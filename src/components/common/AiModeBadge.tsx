import { Activity, AlertTriangle, Bot, Database, FileSearch, Globe2, ScanText } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getBackendAiHealth, getClientAiConfig, type BackendHealth } from "../../services/aiService";
import { useKnowledgeStore } from "../../store/knowledgeStore";

export default function AiModeBadge() {
  const client = getClientAiConfig();
  const { state } = useKnowledgeStore();
  const [backend, setBackend] = useState<BackendHealth | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (client.provider !== "api") return;
    getBackendAiHealth()
      .then((payload) => {
        if (cancelled) return;
        setBackend(payload);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "AI 代理未连接");
      });
    return () => {
      cancelled = true;
    };
  }, [client.provider]);

  const status = useMemo(() => {
    const providerLabel =
      client.provider === "api"
        ? backend
          ? `${backend.provider === "mock" ? "Mock 演示模式" : backend.provider} · ${backend.model}`
          : error
            ? "API 未连接"
            : "API 检测中"
        : "Mock 演示模式";
    const usableDocuments = state.documents.filter((document) => document.canAnswer).length;
    const chunkCount = state.documents.reduce((sum, document) => sum + (document.canAnswer ? document.chunks.length : 0), 0);
    return {
      providerLabel,
      usableDocuments,
      chunkCount,
      searchEnabled: Boolean(backend?.search?.enabled),
      searchProvider: backend?.search?.provider ?? "none",
      ocrEnabled: Boolean(backend?.ocr?.enabled),
      isMock: client.provider === "mock" || backend?.provider === "mock",
    };
  }, [backend, client.provider, error, state.documents]);

  return (
    <div
      className={`ai-mode-glass hidden items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] backdrop-blur-xl md:inline-flex ${
        error || status.isMock ? "border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning)]" : "border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent)]"
      }`}
      title={`当前模型：${status.providerLabel}；本地资料：${state.documents.length}；可用正文片段：${status.chunkCount}；联网搜索：${status.searchEnabled ? "已开启" : "未配置"}；OCR：${status.ocrEnabled ? "已开启" : "未配置"}`}
    >
      {error || status.isMock ? <AlertTriangle className="h-3.5 w-3.5" /> : <Activity className="h-3.5 w-3.5" />}
      <span>{status.providerLabel}</span>
      <span className="mx-1 h-3 w-px bg-[var(--border-subtle)]" />
      <Database className="h-3.5 w-3.5 opacity-70" />
      <span>{status.usableDocuments}/{state.documents.length} 资料</span>
      <FileSearch className="h-3.5 w-3.5 opacity-70" />
      <span>{status.chunkCount} 片段</span>
      <span className="mx-1 h-3 w-px bg-[var(--border-subtle)]" />
      <Globe2 className="h-3.5 w-3.5 opacity-70" />
      <span>{status.searchEnabled ? `联网 ${status.searchProvider}` : "联网未配"}</span>
      <ScanText className="h-3.5 w-3.5 opacity-70" />
      <span>{status.ocrEnabled ? "OCR 开" : "OCR 未配"}</span>
      <Bot className="h-3.5 w-3.5 opacity-70" />
    </div>
  );
}
