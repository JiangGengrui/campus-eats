// 启动时执行 schema.sql（幂等：全部 IF NOT EXISTS）
import { readFileSync } from "node:fs";
import path from "node:path";
import type { Database } from "better-sqlite3";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

export function runMigrations(db: Database): void {
  const schema = readFileSync(path.join(here, "schema.sql"), "utf8");
  db.exec(schema);
  console.log("[db] schema 就绪");
}
