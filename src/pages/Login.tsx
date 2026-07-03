import { ArrowRight, DatabaseZap, LogIn } from "lucide-react";
import { useState } from "react";
import { useAuthStore } from "../store/authStore";

interface LoginProps {
  onRegister: () => void;
}

export default function Login({ onRegister }: LoginProps) {
  const { login, authError, clearError } = useAuthStore();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  function submit() {
    clearError();
    login(username, password);
  }

  return (
    <main className="auth-page thin-scrollbar relative min-h-screen overflow-x-hidden bg-[var(--page-bg)] px-4 py-8 text-[var(--text-secondary)]">
      <div className="cosmic-backdrop" />
      <div className="aurora-layer" />
      <div className="noise-layer" />
      <section className="auth-shell relative z-10 mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center">
        <div className="fade-in max-w-3xl">
          <p className="page-kicker">ZHIMAI AI · Private Knowledge Graph</p>
          <h1 className="page-title">
            登录知脉 AI
            <span className="block text-[var(--text-secondary)]">进入你的知识星图工作台</span>
          </h1>
          <p className="page-subtitle max-w-2xl">
            将资料、项目、问题和成果沉淀为可追溯的个人知识资产。系统会围绕来源片段、节点关系和权限空间组织你的工作流。
          </p>
          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            {[
              ["知识空间", "个人星图与共享星图分离，权限边界清晰。"],
              ["来源可信", "回答、总结和成果生成都回到片段依据。"],
              ["管理后台", "成员、访问、配置与日志统一进入后台。"],
            ].map(([title, detail]) => (
              <div key={title} className="micro-card p-4">
                <p className="text-sm font-semibold text-[var(--text-primary)]">{title}</p>
                <p className="mt-2 text-xs leading-6 text-[var(--text-faint)]">{detail}</p>
              </div>
            ))}
          </div>
        </div>

        <form
          className="lux-card fade-in auth-card rounded-3xl p-6 md:p-8"
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
              <h2 className="text-2xl font-semibold text-[var(--text-primary)]">账号登录</h2>
              <p className="text-xs text-[var(--text-faint)]">使用已注册账号进入知识空间</p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm text-[var(--text-secondary)]">邮箱 / 账号</span>
              <input value={username} onChange={(event) => setUsername(event.target.value)} className="input-shell w-full rounded-2xl px-4 py-3 text-sm" placeholder="输入账号或邮箱" autoComplete="username" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-[var(--text-secondary)]">密码</span>
              <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" className="input-shell w-full rounded-2xl px-4 py-3 text-sm" placeholder="输入密码" autoComplete="current-password" />
            </label>
          </div>

          {authError && <p className="mt-4 rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger)]">{authError}</p>}

          <button type="submit" className="btn-primary mt-6 w-full justify-center py-3">
            <LogIn className="h-4 w-4" />
            登录
          </button>
          <button
            type="button"
            onClick={() => {
              clearError();
              onRegister();
            }}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-full px-4 py-2 text-sm text-[var(--text-muted)] transition hover:text-[var(--accent)]"
          >
            新用户注册
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </section>
    </main>
  );
}
