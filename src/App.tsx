import { Bot, DatabaseZap, FileUp, GitBranch, Home, Layers3, Sparkles, type LucideIcon } from "lucide-react";
import { useMemo, useState, type CSSProperties } from "react";
import AiModeBadge from "./components/common/AiModeBadge";
import Assistant from "./pages/Assistant";
import Dashboard from "./pages/Dashboard";
import Graph from "./pages/Graph";
import Outputs from "./pages/Outputs";
import Upload from "./pages/Upload";
import { cn } from "./utils/cn";

type PageKey = "dashboard" | "upload" | "graph" | "assistant" | "outputs";

const navItems: Array<{ key: PageKey; label: string; icon: LucideIcon }> = [
  { key: "dashboard", label: "工作台", icon: Home },
  { key: "upload", label: "知识导入", icon: FileUp },
  { key: "graph", label: "知脉星图", icon: GitBranch },
  { key: "assistant", label: "知源 Copilot", icon: Bot },
  { key: "outputs", label: "成果工坊", icon: Layers3 },
];

function App() {
  const [page, setPage] = useState<PageKey>("dashboard");
  const [pointer, setPointer] = useState({ x: 50, y: 12 });

  const currentPage = useMemo(() => {
    switch (page) {
      case "upload":
        return <Upload onOpenGraph={() => setPage("graph")} onOpenAssistant={() => setPage("assistant")} />;
      case "graph":
        return <Graph onOpenAssistant={() => setPage("assistant")} />;
      case "assistant":
        return <Assistant />;
      case "outputs":
        return <Outputs />;
      default:
        return <Dashboard onNavigate={setPage} />;
    }
  }, [page]);

  return (
    <main
      className="relative min-h-screen w-full max-w-full overflow-x-hidden bg-[var(--page-bg)] text-[var(--text-secondary)]"
      style={{ "--mx": `${pointer.x}%`, "--my": `${pointer.y}%` } as CSSProperties}
      onPointerMove={(event) => {
        setPointer({
          x: Math.round((event.clientX / Math.max(1, window.innerWidth)) * 100),
          y: Math.round((event.clientY / Math.max(1, window.innerHeight)) * 100),
        });
      }}
    >
      <div className="cosmic-backdrop" />
      <div className="aurora-layer" />
      <div className="noise-layer" />

      <header className="sticky top-0 z-40 px-3 pt-3 md:px-6">
        <div className="topbar-glass mx-auto flex max-w-[1500px] items-center justify-between gap-3 px-3 py-2 md:px-4">
          <button
            type="button"
            onClick={() => setPage("dashboard")}
            className="brand-pill group flex items-center gap-2.5 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-2.5 py-1.5 text-left shadow-soft transition hover:border-[var(--accent-border)] hover:bg-[var(--surface-hover)]"
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--accent)] text-[var(--on-accent)] shadow-[0_0_28px_var(--glow-accent)]">
              <DatabaseZap className="h-4 w-4" />
            </span>
            <span className="hidden sm:block">
              <span className="block text-[13px] font-semibold tracking-[0.16em] text-[var(--text-secondary)]">ZHIMAI AI</span>
              <span className="block text-[11px] text-[var(--text-faint)]">个人知识图谱工作台</span>
            </span>
          </button>

          <nav className="nav-glass flex min-w-0 items-center gap-1 rounded-full border border-[var(--border-subtle)] p-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = item.key === page;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setPage(item.key)}
                  className={cn(
                    "nav-tab flex items-center gap-2 rounded-full px-3 py-2 text-sm text-[var(--text-muted)] md:px-3.5",
                    active && "is-active bg-[var(--selected-bg)] text-[var(--accent)] shadow-[0_0_24px_var(--glow-accent)]",
                    !active && "hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]",
                  )}
                  title={item.label}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden lg:inline">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <AiModeBadge />
            <button type="button" onClick={() => setPage("graph")} className="btn-primary px-4 py-2">
              <Sparkles className="h-4 w-4" />
              打开星图
            </button>
          </div>
        </div>
      </header>

      <div className="relative z-10">{currentPage}</div>
    </main>
  );
}

export default App;
