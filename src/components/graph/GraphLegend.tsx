import { nodeTypeMeta } from "../../data/mockGraphData";
import type { GraphNodeType } from "../../types/graph";

const types: GraphNodeType[] = ["project", "document", "tech", "problem", "output", "tag", "concept"];

export default function GraphLegend() {
  return (
    <div className="pointer-events-none absolute bottom-4 left-4 z-20 flex flex-wrap gap-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-deep)] p-3 backdrop-blur-xl">
      {types.map((type) => (
        <span key={type} className="inline-flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{
              backgroundColor: nodeTypeMeta[type].color,
              boxShadow: `0 0 14px ${nodeTypeMeta[type].glow}`,
            }}
          />
          {nodeTypeMeta[type].label}
        </span>
      ))}
    </div>
  );
}
