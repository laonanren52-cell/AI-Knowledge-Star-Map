import type { GraphData, GraphEdge, GraphNode, GraphNodeType, NodeTypeMeta } from "../types/graph";

export const nodeTypeMeta: Record<GraphNodeType, NodeTypeMeta> = {
  project: { label: "项目", color: "var(--node-project)", glow: "var(--node-project-glow)" },
  document: { label: "文档", color: "var(--node-document)", glow: "var(--node-document-glow)" },
  tech: { label: "技术", color: "var(--node-tech)", glow: "var(--node-tech-glow)" },
  problem: { label: "问题", color: "var(--node-problem)", glow: "var(--node-problem-glow)" },
  output: { label: "成果", color: "var(--node-output)", glow: "var(--node-output-glow)" },
  tag: { label: "标签", color: "var(--node-tag)", glow: "var(--node-tag-glow)" },
  concept: { label: "概念", color: "var(--node-concept)", glow: "var(--node-concept-glow)" },
};

type ClusterSeed = {
  id: string;
  center: [number, number];
  documentId: string;
  project: string;
  documents: string[];
  tech: string[];
  problems: string[];
  outputs: string[];
  tags: string[];
  concepts: string[];
};

const clusterSeeds: ClusterSeed[] = [
  {
    id: "embedded",
    center: [-620, -260],
    documentId: "doc-stm32-main",
    project: "STM32 智能循迹小车",
    documents: ["项目需求说明", "红外循迹调试记录", "OLED 联调日志", "电机驱动测试表"],
    tech: ["STM32F103", "GPIO", "PWM", "I2C", "OLED", "红外循迹", "电机驱动", "差速控制"],
    problems: ["小车不动", "OLED 不亮", "PWM 抖动", "红外误判"],
    outputs: ["简历项目经历", "嵌入式答辩稿", "面试问答"],
    tags: ["嵌入式", "比赛项目", "项目答辩"],
    concepts: ["软硬件联调", "传感器采样", "状态反馈"],
  },
  {
    id: "knowledge-ai",
    center: [500, -240],
    documentId: "doc-graph-ai",
    project: "知脉 AI 个人知识图谱",
    documents: ["系统架构文档", "RAG 问答设计", "图谱交互说明", "资料解析规范"],
    tech: ["RAG", "Embedding", "向量检索", "知识图谱", "大模型", "文档解析", "OCR", "React"],
    problems: ["PDF 解析乱码", "AI 幻觉", "回答缺少来源", "图谱节点过多"],
    outputs: ["PPT 大纲", "项目总结", "产品路演稿"],
    tags: ["人工智能", "知识管理", "可信问答"],
    concepts: ["来源追溯", "实体抽取", "关系推理", "混合验证"],
  },
  {
    id: "study-loop",
    center: [-260, 380],
    documentId: "doc-studio-loop",
    project: "智学闭环 Studio",
    documents: ["课程复习笔记", "错题归因表", "阶段复盘文档", "薄弱点分析记录"],
    tech: ["学习路径", "错题归因", "知识点聚类", "计划生成", "掌握度评估"],
    problems: ["复习目标不清", "知识薄弱点遗漏", "材料分散", "复盘难坚持"],
    outputs: ["复习计划", "课程总结", "薄弱点清单"],
    tags: ["课程复习", "学习闭环", "个人提升"],
    concepts: ["目标拆解", "证据化复习", "阶段复盘"],
  },
  {
    id: "fuban-health",
    center: [720, 360],
    documentId: "doc-fuban-health",
    project: "福伴 AI 健康生活陪伴机器人",
    documents: ["产品需求文档", "健康提醒流程", "家属协同脚本", "风险识别说明"],
    tech: ["任务规划", "多模态识别", "日程提醒", "异常检测", "语音交互"],
    problems: ["提醒打扰过多", "风险解释不足", "老人不会配置", "家属信息滞后"],
    outputs: ["商业计划摘要", "演示脚本", "用户故事"],
    tags: ["健康生活", "人机交互", "产品设计"],
    concepts: ["低打扰陪伴", "可信解释", "家庭协同", "场景化任务"],
  },
];

const relationPool: GraphEdge["relationType"][] = ["mentions", "belongs_to", "uses", "depends_on", "solves", "generates", "related_to"];

function point(center: [number, number], index: number, total: number, ring: number) {
  const angle = (Math.PI * 2 * index) / Math.max(total, 1) + ring * 0.42;
  const radius = ring === 0 ? 0 : 80 + ring * 58 + ((index * 29) % 42);
  return {
    x: Math.round(center[0] + Math.cos(angle) * radius),
    y: Math.round(center[1] + Math.sin(angle) * radius),
  };
}

function nodeId(clusterId: string, type: GraphNodeType, label: string) {
  return `${clusterId}-${type}-${label}`.replace(/[^a-zA-Z0-9\u4e00-\u9fa5-]/g, "-");
}

function createNode(label: string, type: GraphNodeType, cluster: ClusterSeed, index: number, total: number, ring: number): GraphNode {
  return {
    id: nodeId(cluster.id, type, label),
    label,
    type,
    group: cluster.id,
    cluster: cluster.id,
    value: type === "project" ? 40 : type === "document" ? 18 : type === "output" ? 15 : type === "tech" ? 13 : 10,
    confidence: Number((0.78 + ((index * 9) % 18) / 100).toFixed(2)),
    description: `${label} 是「${cluster.project}」星团中的${nodeTypeMeta[type].label}节点，用于连接资料来源、技术概念、问题和可复用成果。`,
    sourceDocumentIds: [cluster.documentId],
    ...point(cluster.center, index, total, ring),
  };
}

function addEdge(edges: GraphEdge[], from: string, to: string, index: number, label: string) {
  if (from === to) return;
  const id = `edge-${from}-${to}`.replace(/[^a-zA-Z0-9-]/g, "-");
  if (edges.some((edge) => edge.id === id)) return;
  edges.push({
    id,
    from,
    to,
    label,
    relationType: relationPool[index % relationPool.length],
    weight: Number((0.58 + (index % 5) * 0.08).toFixed(2)),
    confidence: Number((0.74 + (index % 18) / 100).toFixed(2)),
    evidence: `来源片段显示「${label}」连接了两个知识点，可作为问答和成果生成依据。`,
  });
}

function buildMockGraph(): GraphData {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  clusterSeeds.forEach((cluster, clusterIndex) => {
    const project = createNode(cluster.project, "project", cluster, 0, 1, 0);
    nodes.push(project);

    const buckets: Array<[GraphNodeType, string[], number]> = [
      ["document", cluster.documents, 1],
      ["tech", cluster.tech, 2],
      ["problem", cluster.problems, 3],
      ["output", cluster.outputs, 3],
      ["tag", cluster.tags, 2],
      ["concept", cluster.concepts, 2],
    ];
    const byType = new Map<GraphNodeType, GraphNode[]>();
    buckets.forEach(([type, labels, ring], bucketIndex) => {
      const created = labels.map((label, index) => createNode(label, type, cluster, index + bucketIndex * 2, labels.length + 2, ring));
      byType.set(type, created);
      nodes.push(...created);
    });

    const docs = byType.get("document") ?? [];
    const tech = byType.get("tech") ?? [];
    const problems = byType.get("problem") ?? [];
    const outputs = byType.get("output") ?? [];
    const tags = byType.get("tag") ?? [];
    const concepts = byType.get("concept") ?? [];
    let edgeIndex = clusterIndex * 100;

    docs.forEach((doc, index) => {
      addEdge(edges, project.id, doc.id, edgeIndex++, "关联资料");
      addEdge(edges, doc.id, tech[index % tech.length].id, edgeIndex++, "提到技术");
      addEdge(edges, doc.id, concepts[index % concepts.length].id, edgeIndex++, "解释概念");
    });
    tech.forEach((item, index) => {
      addEdge(edges, project.id, item.id, edgeIndex++, "使用技术");
      addEdge(edges, item.id, concepts[index % concepts.length].id, edgeIndex++, "支撑概念");
      if (index > 0) addEdge(edges, tech[index - 1].id, item.id, edgeIndex++, "技术依赖");
    });
    problems.forEach((problem, index) => {
      addEdge(edges, project.id, problem.id, edgeIndex++, "项目问题");
      addEdge(edges, problem.id, tech[index % tech.length].id, edgeIndex++, "问题定位");
      addEdge(edges, problem.id, concepts[(index + 1) % concepts.length].id, edgeIndex++, "归因");
    });
    outputs.forEach((output, index) => {
      addEdge(edges, project.id, output.id, edgeIndex++, "生成成果");
      addEdge(edges, output.id, docs[index % docs.length].id, edgeIndex++, "引用来源");
      addEdge(edges, output.id, tags[index % tags.length].id, edgeIndex++, "成果标签");
    });
  });

  const shared = ["知识星图", "资料可信度", "成果复用", "混合验证", "来源追溯", "任务型助手"];
  shared.forEach((label, index) => {
    const node: GraphNode = {
      id: `shared-concept-${index}`,
      label,
      type: "concept",
      group: "shared",
      cluster: "shared",
      value: 16,
      confidence: 0.86,
      description: `${label} 是跨资料星团的公共概念。`,
      sourceDocumentIds: clusterSeeds.map((cluster) => cluster.documentId),
      x: Math.round(Math.cos(index) * 180),
      y: Math.round(Math.sin(index * 1.4) * 160),
    };
    nodes.push(node);
    clusterSeeds.forEach((cluster, clusterIndex) => {
      const project = nodes.find((item) => item.label === cluster.project);
      if (project && (index + clusterIndex) % 2 === 0) addEdge(edges, project.id, node.id, 600 + index * 10 + clusterIndex, "跨项目概念");
    });
  });

  return { nodes, edges };
}

export const mockGraphData = buildMockGraph();
