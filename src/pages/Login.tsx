import { DatabaseZap, LogIn, UserPlus } from "lucide-react";
import { useState } from "react";
import { useAuthStore } from "../store/authStore";

export default function Login() {
  const { login, register, authError, clearError } = useAuthStore();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("demo");

  function submit() {
    clearError();
    if (mode === "register") {
      register(username, email, password);
      return;
    }
    login(username, password);
  }

  return (
    <main className="thin-scrollbar relative min-h-screen overflow-x-hidden bg-[var(--page-bg)] px-4 py-8 text-[var(--text-secondary)]">
      <div className="cosmic-backdrop" />
      <div className="aurora-layer" />
      <div className="noise-layer" />
      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center">
        <div className="grid w-full gap-6 lg:grid-cols-[1fr_430px] lg:items-center">
          <div className="fade-in">
            <p className="page-kicker">ZHIMAI AI · 多用户知识空间</p>
            <h1 className="page-title">
              登录知脉 AI
              <span className="block text-[var(--text-secondary)]">进入你的个人知识星图</span>
            </h1>
            <p className="page-subtitle max-w-2xl">
              进入你的个人知识星图，或访问管理员共享知识空间。管理员维护主星图，普通用户可只读查看、搜索和向 Copilot 提问。
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="micro-card p-4">
                <p className="text-sm font-semibold text-[var(--text-primary)]">管理员 Demo</p>
                <p className="mt-2 text-xs leading-6 text-[var(--text-faint)]">账号：admin，任意非空密码。可管理主星图并发布共享更新。</p>
              </div>
              <div className="micro-card p-4">
                <p className="text-sm font-semibold text-[var(--text-primary)]">普通用户 Demo</p>
                <p className="mt-2 text-xs leading-6 text-[var(--text-faint)]">账号：user，任意非空密码。可查看共享星图，也可进入个人星图。</p>
              </div>
            </div>
          </div>

          <form
            className="lux-card fade-in rounded-3xl p-6 md:p-8"
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
          >
            <div className="mb-6 flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--accent)] text-[var(--on-accent)] shadow-[0_0_28px_var(--glow-accent)]">
                <DatabaseZap className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-2xl font-semibold text-[var(--text-primary)]">{mode === "login" ? "登录知脉 AI" : "注册 Demo 用户"}</h2>
                <p className="text-xs text-[var(--warning)]">Demo 登录：不要在这里输入真实密码</p>
              </div>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm text-[var(--text-secondary)]">邮箱或账号</span>
                <input value={username} onChange={(event) => setUsername(event.target.value)} className="input-shell w-full rounded-2xl px-4 py-3 text-sm" placeholder="admin / user" />
              </label>
              {mode === "register" && (
                <label className="block">
                  <span className="mb-2 block text-sm text-[var(--text-secondary)]">邮箱</span>
                  <input value={email} onChange={(event) => setEmail(event.target.value)} className="input-shell w-full rounded-2xl px-4 py-3 text-sm" placeholder="you@example.com" />
                </label>
              )}
              <label className="block">
                <span className="mb-2 block text-sm text-[var(--text-secondary)]">密码</span>
                <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" className="input-shell w-full rounded-2xl px-4 py-3 text-sm" placeholder="Demo 任意非空密码" />
              </label>
            </div>

            {authError && <p className="mt-4 rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger)]">{authError}</p>}

            <button type="submit" className="btn-primary mt-6 w-full justify-center py-3">
              {mode === "login" ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
              {mode === "login" ? "登录" : "注册并登录"}
            </button>
            <button
              type="button"
              onClick={() => {
                clearError();
                setMode(mode === "login" ? "register" : "login");
              }}
              className="mt-3 w-full rounded-full px-4 py-2 text-sm text-[var(--text-muted)] transition hover:text-[var(--accent)]"
            >
              {mode === "login" ? "没有账号？创建一个 Demo 用户" : "已有账号？返回登录"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
