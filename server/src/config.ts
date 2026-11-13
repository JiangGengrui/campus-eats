// 配置唯一入口（CODEBUDDY §3：禁止散落 process.env）
import "dotenv/config";
import { randomBytes } from "node:crypto";

// 云端部署可能不注入 JWT_SECRET：退化为进程内随机密钥（重启后需重新登录），避免直接启动失败
const jwtSecret =
  process.env.JWT_SECRET ??
  (() => {
    console.warn("[config] 未设置 JWT_SECRET，本次启动使用随机密钥，重启后需重新登录");
    return randomBytes(32).toString("hex");
  })();

export const config = {
  port: Number(process.env.PORT ?? 3000),
  isProduction: process.env.NODE_ENV === "production",
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "24h",
  dbPath: process.env.DB_PATH ?? "./data/app.db",
  uploadDir: process.env.UPLOAD_DIR ?? "./uploads",
  uploadMaxBytes: Number(process.env.UPLOAD_MAX_BYTES ?? 2 * 1024 * 1024),
  autoAcceptEnabled: (process.env.AUTO_ACCEPT_ENABLED ?? "off") === "on",
  autoAcceptIntervalSeconds: Number(process.env.AUTO_ACCEPT_INTERVAL_SECONDS ?? 30),
  // 部署自举：空库时自动灌入演示数据（库非空则跳过，不会清空线上数据）
  autoSeed: (process.env.AUTO_SEED ?? "on") === "on",
  // 空库自举时的管理员口令：公网部署务必用环境变量覆盖，缺省值仅用于本地演示
  adminInitialPassword: process.env.ADMIN_INITIAL_PASSWORD ?? "123456",
  // 测试专用：RATE_LIMIT_DISABLED=on 时关闭登录限流（E2E/集成测试会反复登录）
  rateLimitDisabled: (process.env.RATE_LIMIT_DISABLED ?? "off") === "on",
} as const;

if (config.isProduction && config.adminInitialPassword === "123456") {
  console.warn("[config] 未设置 ADMIN_INITIAL_PASSWORD，空库自举的管理员口令为默认值 123456，公网环境请覆盖");
}
