// 登录/注册页（mockup login.html：居中表单卡；?admin=1 高亮管理员入口）
import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { adminLogin, login, register } from "../api/auth.js";
import { useAuthStore } from "../stores/auth.js";

export function LoginPage() {
  const [searchParams] = useSearchParams();
  const isAdminEntry = searchParams.get("admin") === "1";
  const redirect = searchParams.get("redirect") ?? "/";
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const data =
        isAdminEntry
          ? await adminLogin(username, password)
          : mode === "login"
            ? await login(username, password)
            : await register(username, password);
      setAuth(data.token, data.user);
      navigate(data.user.role === "admin" ? "/admin/orders" : redirect, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="auth-wrap">
        <div className="auth-card">
          <h2 className="panel-head" style={{ textAlign: "center" }}>
            {isAdminEntry ? "管理员登录" : mode === "login" ? "登录校味" : "注册校味"}
          </h2>
          <div className="panel-body">
            <form onSubmit={(event) => void handleSubmit(event)}>
              <div className="field">
                <label htmlFor="username">用户名</label>
                <input
                  id="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="学号或昵称"
                  autoComplete="username"
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="password">密码</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="至少 6 位"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  required
                  minLength={6}
                />
              </div>
              {error !== null && (
                <p style={{ fontSize: "var(--text-xs)", color: "var(--color-error)" }}>{error}</p>
              )}
              <button className="btn" style={{ width: "100%" }} disabled={submitting}>
                {submitting ? "处理中…" : mode === "login" || isAdminEntry ? "登录" : "注册并登录"}
              </button>
            </form>
            {!isAdminEntry && (
              <p className="auth-switch">
                {mode === "login" ? "还没有账号？" : "已有账号？"}
                <a
                  href="#switch"
                  onClick={(event) => {
                    event.preventDefault();
                    setMode(mode === "login" ? "register" : "login");
                    setError(null);
                  }}
                >
                  {mode === "login" ? "注册一个" : "直接登录"}
                </a>
              </p>
            )}
            <p className="auth-switch" style={{ fontSize: "var(--text-xs)" }}>
              {isAdminEntry ? (
                <Link to="/login">返回用户登录</Link>
              ) : (
                <Link to="/login?admin=1">管理员入口</Link>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
