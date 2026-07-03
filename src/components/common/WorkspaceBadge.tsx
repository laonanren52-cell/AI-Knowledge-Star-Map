import { ShieldCheck, UsersRound } from "lucide-react";
import { roleLabel, workspaceTypeLabel } from "../../services/authService";
import { useAuthStore } from "../../store/authStore";

export default function WorkspaceBadge({ compact = false }: { compact?: boolean }) {
  const { currentUser, currentWorkspace, currentAccess } = useAuthStore();
  if (!currentUser || !currentWorkspace || !currentAccess) return null;

  return (
    <div className={`workspace-badge micro-card flex items-center gap-2 rounded-2xl px-3 py-2 text-xs text-[var(--text-secondary)] ${compact ? "is-compact" : ""}`}>
      <span className="workspace-name inline-flex min-w-0 items-center gap-1.5 text-[var(--accent)]">
        <UsersRound className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{compact ? currentWorkspace.name : `当前空间：${currentWorkspace.name}`}</span>
      </span>
      {!compact && (
        <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-deep)] px-2 py-1">
          {workspaceTypeLabel(currentWorkspace.type)}
        </span>
      )}
      <span className="role-chip rounded-full border border-[var(--border-subtle)] bg-[var(--surface-deep)] px-2 py-1">
        {currentUser.username} · {roleLabel(currentUser.role)}
      </span>
      <span className={`permission-chip inline-flex items-center gap-1 rounded-full border px-2 py-1 ${currentAccess.canEdit ? "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success)]" : "border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning)]"}`}>
        <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
        {currentAccess.canEdit ? "可编辑" : "只读"}
      </span>
    </div>
  );
}
