import OutputGenerator from "../components/ai/OutputGenerator";

export default function Outputs() {
  return (
    <div className="page-shell fade-in">
      <div className="page-header">
        <p className="page-kicker">
          从来源片段生成可复用成果
        </p>
        <h1 className="page-title-compact">成果工坊</h1>
        <p className="page-subtitle">
          基于知识星图、资料来源和关系证据，一键生成简历项目经历、答辩稿、PPT 大纲、面试问答、复习计划和项目总结。
        </p>
      </div>
      <OutputGenerator />
    </div>
  );
}
