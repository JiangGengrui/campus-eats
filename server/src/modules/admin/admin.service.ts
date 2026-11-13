// 管理后台业务规则（SPEC F7.3/F7.4/F7.5）
import { readFileSync, unlinkSync } from "node:fs";
import type { Dish, Shop, ShopCategory } from "@xiaowei/shared";
import { ERROR_CODES } from "@xiaowei/shared";
import { AppError, notFound } from "../../errors.js";
import { adminRepo } from "./admin.repo.js";

export type ShopUpsertInput = {
  name: string;
  categoryId: number;
  description: string;
  minPriceCents: number;
  deliveryFeeCents: number;
  logoUrl: string | null;
  isActive: boolean;
};

export type DishUpsertInput = {
  shopId: number;
  name: string;
  dishGroup: string;
  priceCents: number;
  imageUrl: string | null;
  isActive: boolean;
};

export function listShops(categoryId: number | null, keyword: string | null): Shop[] {
  return adminRepo.listAllShops(categoryId, keyword);
}

export function createShop(input: ShopUpsertInput): Shop {
  if (adminRepo.categoryById(input.categoryId) === undefined) {
    throw notFound(ERROR_CODES.NOT_FOUND, "分类不存在");
  }
  const id = adminRepo.insertShop(input);
  return adminRepo.listAllShops(null, null).find((shop) => shop.id === id) as Shop;
}

export function updateShop(id: number, input: ShopUpsertInput): void {
  if (!adminRepo.shopExists(id)) {
    throw notFound(ERROR_CODES.NOT_FOUND, "店铺不存在");
  }
  adminRepo.updateShop(id, input);
}

export function setShopActive(id: number, isActive: boolean): void {
  if (!adminRepo.shopExists(id)) {
    throw notFound(ERROR_CODES.NOT_FOUND, "店铺不存在");
  }
  adminRepo.setShopActive(id, isActive);
}

export function listDishes(shopId: number | null): Dish[] {
  return adminRepo.listAllDishes(shopId);
}

export function createDish(input: DishUpsertInput): void {
  if (!adminRepo.shopExists(input.shopId)) {
    throw notFound(ERROR_CODES.NOT_FOUND, "店铺不存在");
  }
  adminRepo.insertDish(input);
}

export function updateDish(id: number, input: DishUpsertInput): void {
  if (!adminRepo.dishExists(id)) {
    throw notFound(ERROR_CODES.NOT_FOUND, "菜品不存在");
  }
  adminRepo.updateDish(id, input);
}

export function setDishActive(id: number, isActive: boolean): void {
  if (!adminRepo.dishExists(id)) {
    throw notFound(ERROR_CODES.NOT_FOUND, "菜品不存在");
  }
  adminRepo.setDishActive(id, isActive);
}

export function listCategories(): ShopCategory[] {
  return adminRepo.listCategories();
}

export function createCategory(name: string): ShopCategory {
  const id = adminRepo.insertCategory(name);
  return { id, name };
}

export function deleteCategory(id: number): void {
  if (adminRepo.categoryById(id) === undefined) {
    throw notFound(ERROR_CODES.NOT_FOUND, "分类不存在");
  }
  // 有店铺引用的分类禁止删除（评审 B3）
  if (adminRepo.categoryInUse(id)) {
    throw new AppError(ERROR_CODES.INVALID_TRANSITION, "该分类下仍有店铺，请先迁移", 409);
  }
  adminRepo.deleteCategory(id);
}

/**
 * 上传文件魔数校验（CODEBUDDY §7 安全清单）：扩展名可被伪造，须校验文件头。
 * 校验失败删除落盘文件并抛 5001。
 */
export function verifyUploadedImage(filePath: string): void {
  const buf = readFileSync(filePath);
  const isJpg = buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  const isPng =
    buf.length >= 8 &&
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => buf[i] === b);
  const isWebp =
    buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP";
  if (!isJpg && !isPng && !isWebp) {
    unlinkSync(filePath);
    throw new AppError(ERROR_CODES.UPLOAD_INVALID, "文件内容不是有效图片", 400);
  }
}
