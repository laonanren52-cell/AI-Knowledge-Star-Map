import type { GraphData, GraphEdge, GraphNode, GraphNodeType } from "../types/graph";
import type { KnowledgeDocument } from "../types/document";

export interface GraphSearchResult {
  node: GraphNode;
  score: number;
  matchedText: string;
  sourceTitle?: string;
}

export function getNeighborIds(nodeId: string, edges: GraphEdge[]) {
  const ids = new Set<string>();
  edges.forEach((edge) => {
    if (edge.from === nodeId) ids.add(edge.to);
    if (edge.to === nodeId) ids.add(edge.from);
  });
  return ids;
}

export function getConnectedEdges(nodeId: string, edges: GraphEdge[]) {
  return edges.filter((edge) => edge.from === nodeId || edge.to === nodeId);
}

export function getNodeById(nodes: GraphNode[], id?: string | null) {
  if (!id) return null;
  return nodes.find((node) => node.id === id) ?? null;
}

function normalizeSearchText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

function fuzzyScore(query: string, text: string) {
  const q = normalizeSearchText(query);
  const t = normalizeSearchText(text);
  if (!q || !t) return 0;
  if (t.includes(q)) return q.length * 12;
  let cursor = 0;
  let score = 0;
  for (const char of q) {
    const index = t.indexOf(char, cursor);
    if (index === -1) continue;
    score += index === cursor ? 4 : 2;
    cursor = index + 1;
  }
  return score >= Math.max(2, q.length) ? score : 0;
}

export function searchGraphNodes(
  nodes: GraphNode[],
  query: string,
  documents: KnowledgeDocument[] = [],
): GraphSearchResult[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];
  const documentMap = new Map(documents.map((document) => [document.id, document]));
  return nodes
    .map((node) => {
      const sourceDocuments = (node.sourceDocumentIds ?? []).map((id) => documentMap.get(id)).filter(Boolean) as KnowledgeDocument[];
      const sourceText = sourceDocuments
        .map((document) => `${document.title} ${document.summary} ${document.keywords.join(" ")} ${document.sourceText}`)
        .join(" ");
      const fields = [
        node.label,
        node.description ?? "",
        node.type,
        node.group,
        node.cluster ?? "",
        sourceText,
      ];
      const score = fields.reduce((sum, field, index) => sum + fuzzyScore(normalized, field) * (index === 0 ? 2.4 : 1), 0);
      const matchedText =
        fields.find((field) => fuzzyScore(normalized, field) > 0)?.slice(0, 120) ??
        node.description ??
        node.label;
      return {
        node,
        score,
        matchedText,
        sourceTitle: sourceDocuments[0]?.title,
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);
}

export function searchNodes(nodes: GraphNode[], query: string) {
  return searchGraphNodes(nodes, query).map((result) => result.node);
}

export function filterGraphByTypes(data: GraphData, activeTypes: GraphNodeType[]) {
  const allowed = new Set(activeTypes);
  const nodes = data.nodes.filter((node) => allowed.has(node.type));
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = data.edges.filter((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to));
  return { nodes, edges };
}

export function createLocalGraph(data: GraphData, nodeId?: string | null) {
  if (!nodeId) return data;
  const neighborIds = getNeighborIds(nodeId, data.edges);
  neighborIds.add(nodeId);
  const nodes = data.nodes.filter((node) => neighborIds.has(node.id));
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = data.edges.filter((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to));
  return { nodes, edges };
}

export function createProjectGraph(data: GraphData, projectId?: string | null) {
  const root = projectId
    ? data.nodes.find((node) => node.id === projectId)
    : data.nodes.find((node) => node.type === "project");
  if (!root) return data;
  const allowedGroups = new Set([root.group, "cross"]);
  const nodes = data.nodes.filter((node) => allowedGroups.has(node.group));
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = data.edges.filter((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to));
  return { nodes, edges };
}

export function getGraphCounts(data: GraphData) {
  return {
    nodeCount: data.nodes.length,
    edgeCount: data.edges.length,
    projectCount: data.nodes.filter((node) => node.type === "project").length,
    outputCount: data.nodes.filter((node) => node.type === "output").length,
  };
}
