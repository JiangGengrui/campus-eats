import type { Dish, DishGroups, Shop, ShopCategory } from "@xiaowei/shared";
import { request } from "./client.js";

export interface DishWithShop extends Dish {
  shopName: string;
}

export interface ShopDetail {
  shop: Shop;
  dishGroups: DishGroups;
}

export interface SearchResult {
  keyword: string;
  shops: Shop[];
  dishes: DishWithShop[];
}

export const shopsApi = {
  categories: () => request<ShopCategory[]>({ method: "GET", url: "/shops/categories" }),
  list: (categoryId?: number) =>
    request<Shop[]>({
      method: "GET",
      url: "/shops",
      params: categoryId === undefined ? undefined : { categoryId },
    }),
  detail: (id: number) => request<ShopDetail>({ method: "GET", url: `/shops/${id}` }),
  search: (keyword: string) => request<SearchResult>({ method: "GET", url: "/shops/search", params: { keyword } }),
};
