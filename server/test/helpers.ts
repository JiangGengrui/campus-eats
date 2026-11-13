// 测试基建：每文件独立临时库（vitest forks 隔离模块注册表，env 在 db 连接前生效）
// 注意：被测模块必须动态 import（本文件执行后才会建立连接/读配置）
import { mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

export const testDir = mkdtempSync(path.join(tmpdir(), "xiaowei-test-"));

process.env.DB_PATH = path.join(testDir, "test.db");
process.env.JWT_SECRET = "test-secret-key";
process.env.UPLOAD_DIR = path.join(testDir, "uploads");
process.env.RATE_LIMIT_DISABLED = "on"; // 集成测试默认关闭限流（429 行为由 rate-limit 单测覆盖）
mkdirSync(process.env.UPLOAD_DIR, { recursive: true });

/** 建表并返回 db 实例（动态 import，确保 env 已就绪） */
export async function loadDb() {
  const { db } = await import("../src/db/connection.js");
  const { runMigrations } = await import("../src/db/migrate.js");
  runMigrations(db);
  return db;
}

export type TestDb = Awaited<ReturnType<typeof loadDb>>;
