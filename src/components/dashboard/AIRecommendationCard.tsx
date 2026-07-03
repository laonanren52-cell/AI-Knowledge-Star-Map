import { ArrowRight, BrainCircuit, FileText, Sparkles } from "lucide-react";
import type { AIRecommendation, RecommendationAction } from "../../store/knowledgeStore";
import type { KnowledgeDocument } from "../../types/document";

interface AIRecommendationCardProps {
  onOpenUpload: () => void;
  onOpenGraph: () => void;
  onOpenAssistant: () => void;
  onOpenOutputs: () => void;
  recommendations: AIRecommendation[];
  latestDocument?: KnowledgeDocument | null;
}

export default function AIRecommendationCard({
  onOpenUpload,
  onOpenGraph,
  onOpenAssistant,
  onOpenOutputs,
  recommendations,
  latestDocument,
}: AIRecommendationCardProps) {
  function runAction(action: RecommendationAction) {
    if (action === "upload") onOpenUpload();
    if (action === "graph") onOpenGraph();
    if (action === "assistant") onOpenAssistant();
    if (action === "outputs") onOpenOutputs();
  }

  const primary = recommendations[0];
  const latestStatus = latestDocument
    ? latestDocument.canAnswer
      ? `最近入库「${latestDocument.title}」，已生成 ${latestDocument.chunks.length} 个可追溯来源片段。`
      : `最近入库「${latestDocument.title}」，但正文暂不可用于可靠问答。`
    : "导入第一份资料后，知脉会自动生成知识星图与下一步建议。";

  return (
    <section className="lux-card workbench-panel p-6 md:p-8">
      <div className="ambient-sheen-right absolute inset-y-0 right-0 w-1/2" />
      <div className="relative grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="flex items-center gap-3 text-[var(--accent)]">
            <BrainCircuit className="h-5 w-5" />
            <span className="text-sm font-medium">AI 今日建议</span>
          </div>
          <p className="mt-5 max-w-3xl text-2xl font-semibold leading-snug text-[var(--text-primary)] md:text-3xl">
            {latestStatus}
          </p>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-muted)]">
            {primary?.detail ?? "建议先上传项目文档、课程笔记或比赛资料，建立第一组知识节点和来源片段。"}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <button type="button" onClick={() => runAction(primary?.action ?? "upload")} className="btn-primary">
              {primary?.title ?? "开始导入资料"}
              <ArrowRight className="h-4 w-4" />
            </button>
            <button type="button" onClick={onOpenUpload} className="btn-secondary">
              <FileText className="h-4 w-4" />
              导入新资料
            </button>
          </div>
        </div>

        <div className="micro-card rounded-2xl p-5">
          <div className="mb-5 flex items-center justify-between">
            <span className="text-sm text-[var(--text-muted)]">推荐下一步</span>
            <Sparkles className="h-4 w-4 text-[var(--accent)]" />
          </div>
          {recommendations.slice(0, 4).map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => runAction(item.action)}
              className="task-card group w-full border-t border-[var(--border-subtle)] py-4 text-left transition first:border-t-0 first:pt-0 hover:translate-x-1"
            >
              <span className="flex items-center justify-between gap-3">
                <span className="text-sm text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">{item.title}</span>
                <span className="rounded-full border border-[var(--accent-border)] bg-[var(--accent-soft)] px-3 py-1 text-xs text-[var(--accent)]">
                  {index === 0 ? "优先" : "可执行"}
                </span>
              </span>
              <span className="mt-2 line-clamp-2 text-xs leading-5 text-[var(--text-faint)]">{item.detail}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
