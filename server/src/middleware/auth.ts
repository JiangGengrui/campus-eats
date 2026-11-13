// 鉴权中间件：只信 JWT claim、不回查数据库（ARCHITECTURE §7 / CODEBUDDY §3）
import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { ERROR_CODES } from "@xiaowei/shared";
import { config } from "../config.js";
import { AppError } from "../errors.js";

export interface AuthUser {
  uid: number;
  role: "user" | "admin";
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthUser;
    }
  }
}

export function signToken(uid: number, role: AuthUser["role"]): string {
  return jwt.sign({ uid, role } satisfies AuthUser, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as jwt.SignOptions["expiresIn"],
  });
}

function verifyBearer(req: Request): AuthUser {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new AppError(ERROR_CODES.UNAUTHORIZED, "请先登录", 401);
  }
  try {
    return jwt.verify(header.slice(7), config.jwtSecret) as AuthUser;
  } catch {
    throw new AppError(ERROR_CODES.UNAUTHORIZED, "登录已过期，请重新登录", 401);
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  req.auth = verifyBearer(req);
  next();
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  // 独立校验而非嵌套 requireAuth：403 不能被鉴权层的 try/catch 吞成 401
  const auth = verifyBearer(req);
  if (auth.role !== "admin") {
    throw new AppError(ERROR_CODES.FORBIDDEN, undefined, 403);
  }
  req.auth = auth;
  next();
}
