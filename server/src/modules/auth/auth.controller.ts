// 认证控制器：zod 校验 + 调 service + 响应壳
import type { Request, Response } from "express";
import { loginSchema, registerSchema } from "@xiaowei/shared";
import * as service from "./auth.service.js";

export function register(req: Request, res: Response): void {
  const input = registerSchema.parse(req.body);
  res.status(201).json({ code: 0, message: "ok", data: service.register(input.username, input.password) });
}

export function login(req: Request, res: Response): void {
  const input = loginSchema.parse(req.body);
  res.json({ code: 0, message: "ok", data: service.login(input.username, input.password) });
}

export function adminLogin(req: Request, res: Response): void {
  const input = loginSchema.parse(req.body);
  res.json({ code: 0, message: "ok", data: service.adminLogin(input.username, input.password) });
}
