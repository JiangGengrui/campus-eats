// 地址控制器：zod 校验 + 调 service + 响应壳
import type { Request, Response } from "express";
import { addressSchema, idParamSchema } from "@xiaowei/shared";
import * as service from "./addresses.service.js";

export function list(req: Request, res: Response): void {
  res.json({ code: 0, message: "ok", data: service.listAddresses(req.auth!.uid) });
}

export function create(req: Request, res: Response): void {
  const input = addressSchema.parse(req.body);
  res.status(201).json({ code: 0, message: "ok", data: service.createAddress(req.auth!.uid, input) });
}

export function update(req: Request, res: Response): void {
  const { id } = idParamSchema.parse(req.params);
  const input = addressSchema.parse(req.body);
  res.json({ code: 0, message: "ok", data: service.updateAddress(req.auth!.uid, id, input) });
}

export function remove(req: Request, res: Response): void {
  const { id } = idParamSchema.parse(req.params);
  service.deleteAddress(req.auth!.uid, id);
  res.json({ code: 0, message: "ok", data: null });
}

export function setDefault(req: Request, res: Response): void {
  const { id } = idParamSchema.parse(req.params);
  res.json({ code: 0, message: "ok", data: service.setDefaultAddress(req.auth!.uid, id) });
}
