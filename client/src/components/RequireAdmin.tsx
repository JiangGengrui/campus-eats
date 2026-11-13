// 后台守卫：非管理员跳后台登录入口（ARCHITECTURE §3 / CODEBUDDY §6）
import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../stores/auth.js";

export function RequireAdmin({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);

  if (user === null || user.role !== "admin") {
    return <Navigate to="/login?admin=1" replace />;
  }
  return <>{children}</>;
}
