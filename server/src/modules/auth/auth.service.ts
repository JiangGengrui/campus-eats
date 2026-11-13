// 认证业务规则：role 由登录端点按所用表写死签发（ARCHITECTURE §7）
import bcrypt from "bcryptjs";
import { ERROR_CODES } from "@xiaowei/shared";
import { AppError } from "../../errors.js";
import { signToken } from "../../middleware/auth.js";
import { findAdminByUsername, findUserByUsername, insertUser } from "./auth.repo.js";

export interface LoginResult {
  token: string;
  user: { id: number; username: string; role: "user" | "admin" };
}

export function register(username: string, password: string): LoginResult {
  if (findUserByUsername(username) !== undefined) {
    throw new AppError(ERROR_CODES.USERNAME_TAKEN, undefined, 409);
  }
  const passwordHash = bcrypt.hashSync(password, 10);
  const uid = insertUser(username, passwordHash);
  return { token: signToken(uid, "user"), user: { id: uid, username, role: "user" } };
}

export function login(username: string, password: string): LoginResult {
  const user = findUserByUsername(username);
  if (user === undefined || !bcrypt.compareSync(password, user.password_hash)) {
    // 统一错误，不区分"用户不存在/密码错误"（SPEC F1.2）
    throw new AppError(ERROR_CODES.INVALID_CREDENTIALS, undefined, 401);
  }
  return { token: signToken(user.id, "user"), user: { id: user.id, username: user.username, role: "user" } };
}

export function adminLogin(username: string, password: string): LoginResult {
  const admin = findAdminByUsername(username);
  if (admin === undefined || !bcrypt.compareSync(password, admin.password_hash)) {
    throw new AppError(ERROR_CODES.INVALID_CREDENTIALS, undefined, 401);
  }
  return { token: signToken(admin.id, "admin"), user: { id: admin.id, username: admin.username, role: "admin" } };
}
