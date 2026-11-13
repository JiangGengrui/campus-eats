// 店铺/浏览/搜索控制器（公开接口）
import type { Request, Response } from "express";
import { z } from "zod";
import { idParamSchema } from "@xiaowei/shared";
import * as service from "./shops.service.js";

const listQuerySchema = z.object({
  categoryId: z.coerce.number().int().positive().optional(),
});

const searchQuerySchema = z.object({
  keyword: z.string().max(30).default(""),
});

export function listCategories(_req: Request, res: Response): void {
  res.json({ code: 0, message: "ok", data: service.listCategories() });
}

export function listShops(req: Request, res: Response): void {
  const { categoryId } = listQuerySchema.parse(req.query);
  res.json({ code: 0, message: "ok", data: service.listShops(categoryId ?? null) });
}

export function getShop(req: Request, res: Response): void {
  const { id } = idParamSchema.parse(req.params);
  res.json({ code: 0, message: "ok", data: service.getShopDetail(id) });
}

export function search(req: Request, res: Response): void {
  const { keyword } = searchQuerySchema.parse(req.query);
  res.json({ code: 0, message: "ok", data: service.search(keyword) });
}
