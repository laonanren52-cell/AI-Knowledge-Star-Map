import { mockGraphData } from "../data/mockGraphData";
import type { GraphData, GraphNodeType } from "../types/graph";
import { createLocalGraph, createProjectGraph, filterGraphByTypes } from "../utils/graphUtils";

export type GraphMode = "global" | "project" | "local";

export function getBaseGraph(): GraphData {
  return mockGraphData;
}

export function getVisibleGraph(
  mode: GraphMode,
  activeTypes: GraphNodeType[],
  selectedNodeId?: string | null,
  graphData: GraphData = getBaseGraph(),
): GraphData {
  const base = graphData;
  const modeGraph =
    mode === "local"
      ? createLocalGraph(base, selectedNodeId)
      : mode === "project"
        ? createProjectGraph(base, selectedNodeId)
        : base;
  return filterGraphByTypes(modeGraph, activeTypes);
}
