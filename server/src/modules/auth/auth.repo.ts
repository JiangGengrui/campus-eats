// 认证数据访问：参数化 SQL（CODEBUDDY §3）
import { db } from "../../db/connection.js";

export interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  created_at: string;
}

export interface AdminRow {
  id: number;
  username: string;
  password_hash: string;
}

const userByusernameStmt = db.prepare("SELECT id, username, password_hash, created_at FROM users WHERE username = ?");
const adminByUsernameStmt = db.prepare("SELECT id, username, password_hash FROM admins WHERE username = ?");
const insertUserStmt = db.prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)");

export function findUserByUsername(username: string): UserRow | undefined {
  return userByusernameStmt.get(username) as UserRow | undefined;
}

export function findAdminByUsername(username: string): AdminRow | undefined {
  return adminByUsernameStmt.get(username) as AdminRow | undefined;
}

export function insertUser(username: string, passwordHash: string): number {
  const result = insertUserStmt.run(username, passwordHash);
  return Number(result.lastInsertRowid);
}
