import { Check, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

const steps = [
  "正在读取资料正文",
  "正在检测正文质量",
  "正在切片保存来源片段",
  "正在抽取知识节点",
  "正在分析节点关系",
  "正在写入个人知识星图",
];

interface AnalysisProgressProps {
  currentStep: number;
  fileName?: string;
  batch?: {
    current: number;
    total: number;
    completed: number;
    failed: number;
  };
}

export default function AnalysisProgress({ currentStep, fileName, batch }: AnalysisProgressProps) {
  return (
    <div className="lux-card rounded-3xl p-6 md:p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">AI 分析进行中</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)]">系统正在把资料转换成正文片段、实体、关系、来源证据和可生成成果。</p>
          {fileName && <p className="mt-2 max-w-xl truncate text-xs text-[var(--accent)]">当前文件：{fileName}</p>}
          {batch && batch.total > 1 && (
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="status-pill">第 {batch.current} / {batch.total} 个</span>
              <span className="status-pill border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success)]">成功 {batch.completed}</span>
              <span className="status-pill border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning)]">失败 {batch.failed}</span>
            </div>
          )}
        </div>
        <Loader2 className="h-6 w-6 animate-spin text-[var(--accent)]" />
      </div>
      <div className="space-y-3">
        {steps.map((step, index) => {
          const done = index < currentStep;
          const active = index === currentStep;
          return (
            <motion.div key={step} animate={{ opacity: done || active ? 1 : 0.45, y: active ? -1 : 0 }} className="micro-card flex items-center gap-4 p-4">
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border ${
                  done
                    ? "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success)]"
                    : active
                      ? "border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent)]"
                      : "border-[var(--border-subtle)] bg-[var(--surface-deep)] text-[var(--text-faint)]"
                }`}
              >
                {done ? <Check className="h-4 w-4" /> : active ? <Loader2 className="h-4 w-4 animate-spin" /> : index + 1}
              </span>
              <span className="text-sm text-[var(--text-secondary)]">{step}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
