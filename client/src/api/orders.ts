import type { OrderStatus, OrderWithItems, PageResult } from "@xiaowei/shared";
import { request } from "./client.js";

export interface CreateOrderResult {
  orderId: number;
  orderNo: string;
  totalCents: number;
}

export interface OrderListQuery {
  status?: OrderStatus | "all";
  page?: number;
  pageSize?: number;
}

export const ordersApi = {
  create: (input: { addressId: number; remark: string; items: { dishId: number; quantity: number }[] }) =>
    request<CreateOrderResult>({ method: "POST", url: "/orders", data: input }),
  list: (query: OrderListQuery = {}) =>
    request<PageResult<OrderWithItems>>({ method: "GET", url: "/orders", params: query }),
  detail: (id: number) => request<OrderWithItems>({ method: "GET", url: `/orders/${id}` }),
  cancel: (id: number) => request<null>({ method: "POST", url: `/orders/${id}/cancel` }),
};
