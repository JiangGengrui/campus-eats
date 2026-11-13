import type { Dish, OrderStatus, OrderWithItems, PageResult, Shop, ShopCategory } from "@xiaowei/shared";
import { request } from "./client.js";

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

export const adminApi = {
  listOrders: (query: { status?: OrderStatus | "all"; page?: number; pageSize?: number }) =>
    request<PageResult<OrderWithItems>>({ method: "GET", url: "/admin/orders", params: query }),
  transition: (id: number, to: OrderStatus) =>
    request<null>({ method: "POST", url: `/admin/orders/${id}/transition`, data: { to } }),

  listShops: (query: { categoryId?: number; keyword?: string } = {}) =>
    request<Shop[]>({ method: "GET", url: "/admin/shops", params: query }),
  createShop: (input: ShopUpsertInput) => request<Shop>({ method: "POST", url: "/admin/shops", data: input }),
  updateShop: (id: number, input: ShopUpsertInput) =>
    request<null>({ method: "PUT", url: `/admin/shops/${id}`, data: input }),
  setShopActive: (id: number, isActive: boolean) =>
    request<null>({ method: "PUT", url: `/admin/shops/${id}/active`, data: { isActive } }),

  listDishes: (shopId?: number) =>
    request<Dish[]>({ method: "GET", url: "/admin/dishes", params: shopId === undefined ? undefined : { shopId } }),
  createDish: (input: DishUpsertInput) => request<null>({ method: "POST", url: "/admin/dishes", data: input }),
  updateDish: (id: number, input: DishUpsertInput) =>
    request<null>({ method: "PUT", url: `/admin/dishes/${id}`, data: input }),
  setDishActive: (id: number, isActive: boolean) =>
    request<null>({ method: "PUT", url: `/admin/dishes/${id}/active`, data: { isActive } }),

  listCategories: () => request<ShopCategory[]>({ method: "GET", url: "/admin/categories" }),
  createCategory: (name: string) =>
    request<ShopCategory>({ method: "POST", url: "/admin/categories", data: { name } }),
  deleteCategory: (id: number) => request<null>({ method: "DELETE", url: `/admin/categories/${id}` }),

  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return request<{ url: string }>({ method: "POST", url: "/admin/upload", data: formData });
  },
};
