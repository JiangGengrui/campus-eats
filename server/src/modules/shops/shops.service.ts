// 店铺/浏览/搜索业务规则（SPEC F2/F3）
import type { DishGroups, Shop, ShopCategory } from "@xiaowei/shared";
import { notFound } from "../../errors.js";
import { ERROR_CODES } from "@xiaowei/shared";
import * as repo from "./shops.repo.js";

export function listCategories(): ShopCategory[] {
  return repo.listCategories();
}

export function listShops(categoryId: number | null): Shop[] {
  return repo.listActiveShops(categoryId);
}

export interface ShopDetail {
  shop: Shop;
  dishGroups: DishGroups;
}

export function getShopDetail(id: number): ShopDetail {
  const shop = repo.getActiveShop(id);
  if (shop === undefined) {
    throw notFound(ERROR_CODES.SHOP_NOT_FOUND);
  }
  const dishes = repo.listActiveDishesByShop(id);
  const dishGroups: DishGroups = {};
  for (const dish of dishes) {
    const group = dishGroups[dish.dishGroup] ?? (dishGroups[dish.dishGroup] = []);
    group.push(dish);
  }
  return { shop, dishGroups };
}

export interface SearchResult {
  keyword: string;
  shops: Shop[];
  dishes: repo.DishWithShop[];
}

export function search(keyword: string): SearchResult {
  const trimmed = keyword.trim();
  if (trimmed.length === 0) {
    return { keyword: "", shops: [], dishes: [] };
  }
  return {
    keyword: trimmed,
    shops: repo.searchShops(trimmed),
    dishes: repo.searchDishes(trimmed),
  };
}
