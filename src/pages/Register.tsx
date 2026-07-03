import { ArrowLeft, DatabaseZap, UserPlus } from "lucide-react";
import { useState } from "react";
import { useAuthStore } from "../store/authStore";

interface RegisterProps {
  onLogin: () => void;
}

export default function Register({ onLogin }: RegisterProps) {
  const { register, authError, clearError } = useAuthStore();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  function submit() {
    clearError();
    setLocalError(null);
    if (password !== confirmPassword) {
      setLocalError("两次输入的密码不一致。");
      return;
    }
    register(username, email, password);
  }

  return (
    <main className="auth-page thin-scrollbar relative min-h-screen overflow-x-hidden bg-[var(--page-bg)] px-4 py-8 text-[var(--text-secondary)]">
      <div className="cosmic-backdrop" />
      <div className="aurora-layer" />
      <div className="noise-layer" />
      <section className="auth-shell relative z-10 mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_440px] lg:items-center">
        <div className="fade-in max-w-3xl">
          <p className="page-kicker">Create Workspace Account</p>
          <h1 className="page-title">
            注册知识空间账号
            <span className="block text-[var(--text-secondary)]">从个人星图开始沉淀资料</span>
          </h1>
          <p className="page-subtitle max-w-2xl">
            注册后会自动创建你的个人知识星图。你可以上传资料、生成节点和关系，也可以在有权限时查看管理员共享星图。
          </p>
          <div className="mt-7 micro-card max-w-xl p-4">
            <p className="text-sm font-semibold text-[var(--text-primary)]">注册后下一步</p>
            <p className="mt-2 text-xs leading-6 text-[var(--text-faint)]">进入空间选择页，选择个人星图或可访问的共享星图，再开始导入资料。</p>
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
              <h2 className="text-2xl font-semibold text-[var(--text-primary)]">创建账号</h2>
              <p className="text-xs text-[var(--text-faint)]">用于进入你的个人知识空间</p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm text-[var(--text-secondary)]">用户名</span>
              <input value={username} onChange={(event) => setUsername(event.target.value)} className="input-shell w-full rounded-2xl px-4 py-3 text-sm" placeholder="例如 cheng" autoComplete="username" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-[var(--text-secondary)]">邮箱或账号</span>
              <input value={email} onChange={(event) => setEmail(event.target.value)} className="input-shell w-full rounded-2xl px-4 py-3 text-sm" placeholder="you@example.com" autoComplete="email" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-[var(--text-secondary)]">密码</span>
              <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" className="input-shell w-full rounded-2xl px-4 py-3 text-sm" placeholder="至少 6 位" autoComplete="new-password" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-[var(--text-secondary)]">确认密码</span>
              <input value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} type="password" className="input-shell w-full rounded-2xl px-4 py-3 text-sm" placeholder="再次输入密码" autoComplete="new-password" />
            </label>
          </div>

          {(localError || authError) && <p className="mt-4 rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger)]">{localError || authError}</p>}

          <button type="submit" className="btn-primary mt-6 w-full justify-center py-3">
            <UserPlus className="h-4 w-4" />
            注册并继续
          </button>
          <button
            type="button"
            onClick={() => {
              clearError();
              onLogin();
            }}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-full px-4 py-2 text-sm text-[var(--text-muted)] transition hover:text-[var(--accent)]"
          >
            <ArrowLeft className="h-4 w-4" />
            返回登录
          </button>
        </form>
      </section>
    </main>
  );
}
