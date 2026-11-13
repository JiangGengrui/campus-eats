// better-sqlite3 连接：WAL + 外键开启（ARCHITECTURE §10）
// 风险预案：若本机 better-sqlite3 安装失败，降级 node:sqlite 内置模块，仅改本文件。
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { config } from "../config.js";
import { runMigrations } from "./migrate.js";

const dbFile = path.resolve(config.dbPath);
mkdirSync(path.dirname(dbFile), { recursive: true });

export const db = new Database(dbFile);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
// 开库即建表：各 repo 在模块顶层就 prepare 语句，建表必须早于任何 repo 模块求值
runMigrations(db);
