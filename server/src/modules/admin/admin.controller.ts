// 管理后台控制器（全部 requireAdmin，见 admin.routes）
import type { Request, Response } from "express";
import { z } from "zod";
import { categorySchema, dishUpsertSchema, ERROR_CODES, idParamSchema, shopUpsertSchema } from "@xiaowei/shared";
import * as service from "./admin.service.js";

const listShopsQuerySchema = z.object({
  categoryId: z.coerce.number().int().positive().optional(),
  keyword: z.string().trim().max(30).optional(),
});

const listDishesQuerySchema = z.object({
  shopId: z.coerce.number().int().positive().optional(),
});

const activeSchema = z.object({ isActive: z.boolean() });

function nullIfEmpty(value: string | null | undefined): string | null {
  return value === null || value === undefined || value === "" ? null : value;
}

export function listShops(req: Request, res: Response): void {
  const { categoryId, keyword } = listShopsQuerySchema.parse(req.query);
  res.json({ code: 0, message: "ok", data: service.listShops(categoryId ?? null, nullIfEmpty(keyword)) });
}

export function createShop(req: Request, res: Response): void {
  const input = shopUpsertSchema.parse(req.body);
  res.status(201).json({ code: 0, message: "ok", data: service.createShop({ ...input, logoUrl: nullIfEmpty(input.logoUrl) }) });
}

export function updateShop(req: Request, res: Response): void {
  const { id } = idParamSchema.parse(req.params);
  const input = shopUpsertSchema.parse(req.body);
  service.updateShop(id, { ...input, logoUrl: nullIfEmpty(input.logoUrl) });
  res.json({ code: 0, message: "ok", data: null });
}

export function setShopActive(req: Request, res: Response): void {
  const { id } = idParamSchema.parse(req.params);
  const { isActive } = activeSchema.parse(req.body);
  service.setShopActive(id, isActive);
  res.json({ code: 0, message: "ok", data: null });
}

export function listDishes(req: Request, res: Response): void {
  const { shopId } = listDishesQuerySchema.parse(req.query);
  res.json({ code: 0, message: "ok", data: service.listDishes(shopId ?? null) });
}

export function createDish(req: Request, res: Response): void {
  const input = dishUpsertSchema.parse(req.body);
  service.createDish({ ...input, imageUrl: nullIfEmpty(input.imageUrl) });
  res.status(201).json({ code: 0, message: "ok", data: null });
}

export function updateDish(req: Request, res: Response): void {
  const { id } = idParamSchema.parse(req.params);
  const input = dishUpsertSchema.parse(req.body);
  service.updateDish(id, { ...input, imageUrl: nullIfEmpty(input.imageUrl) });
  res.json({ code: 0, message: "ok", data: null });
}

export function setDishActive(req: Request, res: Response): void {
  const { id } = idParamSchema.parse(req.params);
  const { isActive } = activeSchema.parse(req.body);
  service.setDishActive(id, isActive);
  res.json({ code: 0, message: "ok", data: null });
}

export function listCategories(_req: Request, res: Response): void {
  res.json({ code: 0, message: "ok", data: service.listCategories() });
}

export function createCategory(req: Request, res: Response): void {
  const { name } = categorySchema.parse(req.body);
  res.status(201).json({ code: 0, message: "ok", data: service.createCategory(name) });
}

export function deleteCategory(req: Request, res: Response): void {
  const { id } = idParamSchema.parse(req.params);
  service.deleteCategory(id);
  res.json({ code: 0, message: "ok", data: null });
}

/** 图片上传成功后返回可访问 URL（multer 已落盘，SPEC F7.4） */
export function uploadDone(req: Request, res: Response): void {
  const file = req.file;
  if (file === undefined) {
    res.status(400).json({ code: ERROR_CODES.UPLOAD_INVALID, message: "仅支持 jpg/png/webp 图片", data: null });
    return;
  }
  service.verifyUploadedImage(file.path);
  res.status(201).json({ code: 0, message: "ok", data: { url: `/uploads/${file.filename}` } });
}
