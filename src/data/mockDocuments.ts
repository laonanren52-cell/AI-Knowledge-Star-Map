import type { KnowledgeDocument } from "../types/document";

function makeChunks(documentId: string, sourceText: string) {
  const sentences = sourceText
    .split(/(?<=[。！？.!?])\s*/)
    .map((item) => item.trim())
    .filter(Boolean);

  return sentences.slice(0, 4).map((text, index) => ({
    id: `${documentId}-chunk-${index + 1}`,
    index,
    text,
    start: index * 160,
    end: index * 160 + text.length,
  }));
}

function parsedDocument(
  input: Omit<
    KnowledgeDocument,
    "parseStatus" | "parseMessage" | "extractedLength" | "isGarbled" | "needsOcr" | "canAnswer" | "chunks"
  >,
): KnowledgeDocument {
  return {
    ...input,
    parseStatus: "parsed",
    parseMessage: "正文解析成功，已切片并可用于可靠问答。",
    extractedLength: input.sourceText.replace(/\s/g, "").length,
    isGarbled: false,
    needsOcr: false,
    canAnswer: true,
    chunks: makeChunks(input.id, input.sourceText),
  };
}

export const mockDocuments: KnowledgeDocument[] = [
  parsedDocument({
    id: "doc-stm32-main",
    title: "STM32 智能循迹小车项目文档",
    kind: "project",
    sizeLabel: "2.8 MB",
    uploadedAt: "2026-06-28",
    summary: "基于 STM32F103 完成两轮循迹小车，覆盖 GPIO 输入、PWM 调速、I2C OLED 显示、电机驱动与红外循迹调试。",
    keywords: ["STM32F103", "GPIO", "PWM", "OLED", "红外循迹", "电机驱动"],
    sourceText:
      "红外循迹模块通过 GPIO 读取黑线状态，PWM 输出控制左右电机差速，OLED 用于显示运行状态和调试信息。项目中的主要风险是电机供电不足、GPIO 配置错误、PWM 占空比不稳定和红外阈值误判。答辩时应说明传感器采样、电机驱动、调试日志和问题定位过程。",
    confidence: 0.93,
  }),
  parsedDocument({
    id: "doc-graph-ai",
    title: "AI 个人知识图谱系统设计稿",
    kind: "docx",
    sizeLabel: "1.6 MB",
    uploadedAt: "2026-06-29",
    summary: "描述资料解析、实体抽取、关系推理、RAG 问答、来源引用和 Obsidian Global Graph 风格可视化。",
    keywords: ["知识图谱", "RAG", "Embedding", "向量检索", "React", "来源引用"],
    sourceText:
      "系统将上传资料解析为实体与关系，结合本地片段检索提供可追溯问答，并用力导向星图呈现个人知识资产。所有回答必须显示本地来源片段，资料不足时不能伪造结论。星图节点需要与 Copilot 联动，支持从节点发起提问、总结和成果生成。",
    confidence: 0.9,
  }),
  parsedDocument({
    id: "doc-studio-loop",
    title: "智学闭环 Studio 课程复习笔记",
    kind: "md",
    sizeLabel: "780 KB",
    uploadedAt: "2026-06-30",
    summary: "围绕课程知识点、薄弱点诊断、复习计划、错题归因和阶段性成果生成构建闭环学习流程。",
    keywords: ["课程复习", "薄弱点", "复习计划", "错题归因", "学习闭环"],
    sourceText:
      "系统根据用户资料识别薄弱点，生成复习计划，并把错题、概念和项目成果连接到同一张知识图谱。每次复盘后需要沉淀可追溯来源，避免只给泛化建议。稳定结论应保存为成果节点，反复问题应保存为问题节点。",
    confidence: 0.88,
  }),
  parsedDocument({
    id: "doc-fuban-health",
    title: "福伴 AI 健康生活陪伴机器人材料",
    kind: "pdf",
    sizeLabel: "4.2 MB",
    uploadedAt: "2026-07-01",
    summary: "介绍面向老人健康生活场景的 AI 陪伴机器人，包括健康提醒、日程陪伴、风险识别和家属协同。",
    keywords: ["健康陪伴", "AI 助手", "任务规划", "风险识别", "多模态"],
    sourceText:
      "福伴 AI 通过生活任务、健康提醒和家属协同提升老人日常照护质量，强调可信解释与低打扰交互。产品需要区分健康建议、风险提醒和家属反馈，避免过度打扰老人。AI 建议必须给出来源和置信度。",
    confidence: 0.86,
  }),
];
