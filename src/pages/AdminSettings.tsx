import {
  Activity,
  Ban,
  CheckCircle2,
  Database,
  Globe2,
  KeyRound,
  LogOut,
  MonitorDot,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  UserCog,
  UsersRound,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { getAdminOverview, type AdminOverview } from "../services/backendDataService";
import { useAiStatus } from "../store/aiStatusStore";
import { useAuthStore } from "../store/authStore";
import { useKnowledgeStore } from "../store/knowledgeStore";
import { formatShanghaiDateTime } from "../utils/time";

export default function AdminSettings() {
  const {
    users,
    workspaces,
    currentUser,
    currentWorkspace,
    currentAccess,
    metrics,
    auditLogs,
    authError,
    setUserEnabled,
    deleteUser,
    changePassword,
    updateProfile,
    clearError,
    logout,
  } = useAuthStore();
  const { state } = useKnowledgeStore();
  const { status: aiStatus, refreshHealth } = useAiStatus();
  const [userSearch, setUserSearch] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [profileName, setProfileName] = useState(currentUser?.username ?? "");
  const [profileEmail, setProfileEmail] = useState(currentUser?.email ?? "");
  const [notice, setNotice] = useState<string | null>(null);
  const [overview, setOverview] = useState<AdminOverview | null>(null);

  const canAccessAdminPanel = currentUser?.role === "admin" && currentUser.canAccessAdminPanel !== false;

  useEffect(() => {
    setProfileName(currentUser?.username ?? "");
    setProfileEmail(currentUser?.email ?? "");
  }, [currentUser?.email, currentUser?.username]);

  useEffect(() => {
    if (!canAccessAdminPanel) return;
    let cancelled = false;
    getAdminOverview()
      .then((nextOverview) => {
        if (!cancelled) setOverview(nextOverview);
      })
      .catch(() => {
        // The local store remains as a fallback if the backend is temporarily unavailable.
      });
    return () => {
      cancelled = true;
    };
  }, [canAccessAdminPanel, currentUser?.id]);

  const displayUsers = canAccessAdminPanel ? overview?.users ?? users : currentUser ? [currentUser] : [];
  const displayMetrics = overview?.metrics ?? metrics;
  const displayAuditLogs = overview ? [...overview.loginLogs, ...overview.activityLogs] : auditLogs;
  const filteredUsers = useMemo(() => {
    const keyword = userSearch.trim().toLowerCase();
    if (!keyword) return displayUsers;
    return displayUsers.filter((user) => `${user.username} ${user.email} ${user.role}`.toLowerCase().includes(keyword));
  }, [displayUsers, userSearch]);

  const uploadCount = state.recentActivities.filter((activity) => activity.type === "upload").length;
  const askCount = state.recentActivities.filter((activity) => activity.type === "ask").length;
  const generateCount = state.recentActivities.filter((activity) => activity.type === "generate").length;
  const onlineUsers = displayUsers.filter((user) => user.online || user.isOnline);
  const adminWorkspace = workspaces.find((workspace) => workspace.type === "admin_public");
  const permissionStatus = currentAccess?.canEdit ? "可编辑" : currentAccess?.canRead ? "只读" : "无访问权限";
  const accessStatus = currentAccess ? (currentAccess.canRead ? "可访问" : "不可访问") : "暂无记录";

  function updateAccountPassword() {
    clearError();
    setNotice(null);
    if (!currentUser) return;
    changePassword(currentUser.id, accountPassword);
    if (accountPassword.length >= 6) {
      setAccountPassword("");
      setNotice("密码已更新。");
    }
  }

  function updateAccountProfile() {
    clearError();
    setNotice(null);
    if (!currentUser) return;
    updateProfile(currentUser.id, profileName, profileEmail);
    setNotice("账户资料已更新。");
  }

  function resetPassword(userId: string) {
    const temporaryPassword = `Zm-${Math.random().toString(36).slice(2, 8)}-${new Date().getFullYear()}`;
    changePassword(userId, temporaryPassword);
    setNotice(`已生成临时密码：${temporaryPassword}。请通过安全渠道发送给该用户。`);
  }

  return (
    <div className="page-shell fade-in">
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="page-kicker">Settings</p>
          <h1 className="page-title-compact">设置</h1>
          <p className="page-subtitle">查看空间权限、AI 运行状态、成员管理和账户安全信息。</p>
        </div>
      </div>

      {(authError || notice || currentUser?.mustChangePassword) && (
        <div className={`mb-5 rounded-3xl border p-4 text-sm leading-7 ${authError ? "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger)]" : "border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning)]"}`}>
          {authError || notice || "当前账号仍在使用初始化密码策略，建议尽快修改密码。"}
        </div>
      )}

      <section className="grid gap-5 xl:grid-cols-2">
        <section className="lux-card rounded-3xl p-5">
          <div className="mb-4 flex items-center gap-3">
            <span className="icon-tile">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">空间与权限</h2>
              <p className="text-sm text-[var(--text-faint)]">当前知识空间、身份和访问范围。</p>
            </div>
          </div>
          <div className="grid gap-3">
            <InfoRow label="当前空间" value={currentWorkspace?.name ?? "暂无记录"} />
            <InfoRow label="空间类型" value={formatWorkspaceType(currentWorkspace?.type)} />
            <InfoRow label="当前用户" value={currentUser?.username ?? "暂无记录"} />
            <InfoRow label="用户角色" value={formatRole(currentUser?.role)} />
            <InfoRow label="权限状态" value={permissionStatus} />
            <InfoRow label="空间访问状态" value={accessStatus} />
            <InfoRow label="可访问范围" value={currentAccess?.reason ?? "暂无记录"} />
          </div>
        </section>

        <section className="lux-card rounded-3xl p-5">
          <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <span className="icon-tile">
                <Settings className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">AI 与联网配置</h2>
                <p className="text-sm text-[var(--text-faint)]">来自 /api/health 的运行状态摘要。</p>
              </div>
            </div>
            <button type="button" onClick={() => void refreshHealth()} className="btn-secondary px-3 py-2">
              <RefreshCw className="h-4 w-4" />
              刷新
            </button>
          </div>
          <div className="grid gap-3">
            <InfoRow label="AI Provider" value={aiStatus.provider || "暂无记录"} />
            <InfoRow label="当前模型" value={aiStatus.model || "暂无记录"} />
            <InfoRow label="联网搜索状态" value={aiStatus.searchConfigured ? "已配置" : aiStatus.searchEnabled ? "已启用" : "未配置"} />
            <InfoRow label="搜索 Provider" value={aiStatus.searchProvider || "暂无记录"} />
            <InfoRow label="OCR 状态" value={aiStatus.ocrConfigured || aiStatus.ocrEnabled ? "已配置" : "未配置"} />
            <InfoRow label="Mock 状态" value={aiStatus.isMockMode ? "Mock 演示模式" : "真实 AI 模式"} />
            <InfoRow label="健康检查状态" value={aiStatus.summary} />
            <InfoRow label="状态摘要" value={aiStatus.lastError ?? aiStatus.detail} />
          </div>
        </section>
      </section>

      {canAccessAdminPanel && (
        <section className="admin-metrics-grid my-5 grid gap-4">
          <AdminMetric icon={<UsersRound className="h-4 w-4" />} label="成员数" value={`${displayUsers.length}`} detail={`${onlineUsers.length} 人在线`} />
          <AdminMetric icon={<Activity className="h-4 w-4" />} label="今日访问" value={`${displayMetrics.todayVisits}`} detail={`总访问 ${displayMetrics.totalVisits}`} />
          <AdminMetric icon={<ShieldCheck className="h-4 w-4" />} label="共享星图访问" value={`${displayMetrics.sharedGraphVisits}`} detail={adminWorkspace?.name ?? "管理员共享星图"} />
          <AdminMetric icon={<Database className="h-4 w-4" />} label="资料 / 节点" value={`${state.documents.length} / ${state.graph.nodes.length}`} detail={`${state.graph.edges.length} 条关系`} />
          <AdminMetric icon={<MonitorDot className="h-4 w-4" />} label="Copilot / 生成" value={`${askCount} / ${generateCount}`} detail={`${uploadCount} 次上传记录`} />
        </section>
      )}

      <div className="admin-console-grid mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <section className="lux-card rounded-3xl p-5">
          <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">成员管理</h2>
              <p className="mt-1 text-sm text-[var(--text-faint)]">成员列表、用户状态、启用 / 停用、重置密码和删除用户。</p>
            </div>
            {canAccessAdminPanel && (
              <label className="input-shell flex min-w-[260px] items-center gap-2 rounded-2xl px-3 py-2">
                <Search className="h-4 w-4 text-[var(--accent)]" />
                <input value={userSearch} onChange={(event) => setUserSearch(event.target.value)} placeholder="搜索用户" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--text-faint)]" />
              </label>
            )}
          </div>

          {canAccessAdminPanel ? (
            <div className="thin-scrollbar max-h-[520px] overflow-y-auto pr-1">
              <div className="grid gap-3">
                {filteredUsers.map((user) => {
                  const privateWorkspace = workspaces.find((workspace) => workspace.ownerId === user.id && workspace.type === "user_private");
                  return (
                    <article key={user.id} className="micro-card p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-base font-semibold text-[var(--text-primary)]">{user.username}</h3>
                            <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-deep)] px-2 py-1 text-xs text-[var(--text-muted)]">{formatRole(user.role)}</span>
                            <span className={`rounded-full border px-2 py-1 text-xs ${user.enabled === false ? "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger)]" : "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success)]"}`}>
                              {user.enabled === false ? "已停用" : "启用中"}
                            </span>
                            <span className={`rounded-full border px-2 py-1 text-xs ${user.online ? "border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent)]" : "border-[var(--border-subtle)] bg-[var(--surface-soft)] text-[var(--text-faint)]"}`}>
                              {user.online ? "在线" : "离线"}
                            </span>
                          </div>
                          <p className="mt-2 truncate text-sm text-[var(--text-muted)]">{user.email}</p>
                          <p className="mt-2 text-xs text-[var(--text-faint)]">
                            注册 {formatShanghaiDateTime(user.createdAt)} · 最近活跃 {formatShanghaiDateTime(user.lastActiveAt)} · 最近 IP {user.lastLoginIp ?? user.lastIp ?? "local-session"}
                          </p>
                          <p className="mt-1 text-xs text-[var(--text-faint)]">
                            共享星图：可访问 · 个人星图：{privateWorkspace ? "已创建" : "未创建"} · 登录 {user.loginCount ?? 0} 次
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => setUserEnabled(user.id, user.enabled === false)} className="btn-secondary px-3 py-2">
                            {user.enabled === false ? <CheckCircle2 className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                            {user.enabled === false ? "启用" : "停用"}
                          </button>
                          <button type="button" onClick={() => resetPassword(user.id)} className="btn-secondary px-3 py-2">
                            <RefreshCw className="h-4 w-4" />
                            重置密码
                          </button>
                          {user.id !== currentUser?.id && (
                            <button type="button" onClick={() => deleteUser(user.id)} className="rounded-full border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3 py-2 text-sm text-[var(--danger)]" title="删除用户">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-soft)] p-4 text-sm leading-7 text-[var(--text-faint)]">
              当前账号没有成员管理权限。成员列表、启用 / 停用、重置密码和删除用户仅管理员可用。
            </div>
          )}
        </section>

        <section className="lux-card rounded-3xl p-5">
          <div className="mb-4 flex items-center gap-3">
            <span className="icon-tile">
              <KeyRound className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">账户与安全</h2>
              <p className="text-sm text-[var(--text-faint)]">当前账号、修改密码和退出登录。</p>
            </div>
          </div>
          <div className="grid gap-3">
            <InfoRow label="当前账号" value={currentUser?.username ?? "暂无记录"} />
            <InfoRow label="当前角色" value={formatRole(currentUser?.role)} />
            <input value={profileName} onChange={(event) => setProfileName(event.target.value)} className="input-shell rounded-2xl px-4 py-3 text-sm" placeholder="用户名" />
            <input value={profileEmail} onChange={(event) => setProfileEmail(event.target.value)} className="input-shell rounded-2xl px-4 py-3 text-sm" placeholder="邮箱或账号" />
            <button type="button" onClick={updateAccountProfile} className="btn-secondary justify-center">
              <UserCog className="h-4 w-4" />
              更新账户资料
            </button>
            <input value={accountPassword} onChange={(event) => setAccountPassword(event.target.value)} type="password" className="input-shell rounded-2xl px-4 py-3 text-sm" placeholder="输入新密码" />
            <button type="button" onClick={updateAccountPassword} className="btn-primary justify-center">
              <KeyRound className="h-4 w-4" />
              修改密码
            </button>
            <button type="button" onClick={logout} className="btn-secondary justify-center">
              <LogOut className="h-4 w-4" />
              退出登录
            </button>
          </div>
        </section>
      </div>

      {canAccessAdminPanel && (
        <section className="mt-5 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="lux-card rounded-3xl p-5">
            <div className="mb-4 flex items-center gap-3">
              <Globe2 className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">在线与 IP 状态</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {onlineUsers.length > 0 ? (
                onlineUsers.map((user) => (
                  <div key={user.id} className="micro-card p-4">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{user.username}</p>
                    <p className="mt-2 text-xs text-[var(--text-faint)]">最近 IP：{user.lastLoginIp ?? user.lastIp ?? "local-session"}</p>
                    <p className="mt-1 text-xs text-[var(--text-faint)]">最近活跃：{formatShanghaiDateTime(user.lastActiveAt)}</p>
                    <p className="mt-1 text-xs text-[var(--text-faint)]">最近页面：{user.role === "admin" ? "管理后台" : "知识工作台"}</p>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-soft)] p-4 text-sm text-[var(--text-faint)]">暂无在线用户。</p>
              )}
            </div>
          </div>

          <div className="lux-card rounded-3xl p-5">
            <div className="mb-4 flex items-center gap-3">
              <Activity className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">操作日志</h2>
            </div>
            <div className="thin-scrollbar max-h-[360px] space-y-2 overflow-y-auto pr-1">
              {[
                ...displayAuditLogs,
                ...state.recentActivities.map((activity) => ({ id: activity.id, type: activity.type, actorName: currentUser?.username, detail: activity.title, createdAt: activity.createdAt })),
              ]
                .slice(0, 24)
                .map((log) => (
                  <div key={log.id} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-[var(--text-primary)]">{log.detail}</span>
                      <span className="shrink-0 text-xs text-[var(--text-faint)]">{formatShanghaiDateTime(("loginAt" in log ? log.loginAt : undefined) ?? log.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-xs text-[var(--text-faint)]">{log.actorName ?? "system"} · {log.type}</p>
                  </div>
                ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-4 py-3">
      <span className="shrink-0 text-sm text-[var(--text-muted)]">{label}</span>
      <span className="min-w-0 text-right text-sm font-medium text-[var(--text-primary)]">{value || "暂无记录"}</span>
    </div>
  );
}

function AdminMetric({ icon, label, value, detail }: { icon: ReactNode; label: string; value: string; detail: string }) {
  return (
    <div className="micro-card hover-lift p-4">
      <div className="flex items-center gap-2 text-xs text-[var(--text-faint)]">
        <span className="text-[var(--accent)]">{icon}</span>
        {label}
      </div>
      <p className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">{value}</p>
      <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--text-faint)]">{detail}</p>
    </div>
  );
}

function formatWorkspaceType(type?: string) {
  if (type === "admin_public") return "管理员共享星图";
  if (type === "user_private") return "个人星图";
  if (type === "demo_public") return "演示星图";
  return "暂无记录";
}

function formatRole(role?: string) {
  if (role === "admin") return "管理员";
  if (role === "user") return "普通用户";
  return "暂无记录";
}
