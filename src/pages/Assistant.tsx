import AIChatPanel from "../components/ai/AIChatPanel";

export default function Assistant() {
  return (
    <div className="page-shell fade-in">
      <div className="page-header">
        <p className="page-kicker">
          节点上下文 · 来源引用 · 联网增强
        </p>
        <h1 className="page-title-compact">知源 Copilot</h1>
        <p className="page-subtitle">
          面向资料、来源和知识星图的 AI 工作台。它会优先使用当前节点上下文、关联资料和来源片段，而不是只读取文件名或泛聊。
        </p>
      </div>
      <AIChatPanel />
    </div>
  );
}
