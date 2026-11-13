// DTO 单一事实源：client 与 server 共用（ARCHITECTURE §4/§6）
// 金额一律 INTEGER 分（*_cents），展示层 ÷100。
import type { OrderStatus } from "./order-status.js";

export interface User {
  id: number;
  username: string;
  createdAt: string;
}

export interface Admin {
  id: number;
  username: string;
}

export interface ShopCategory {
  id: number;
  name: string;
}

export interface Shop {
  id: number;
  name: string;
  logoUrl: string | null;
  description: string;
  categoryId: number;
  /** 列表接口带出的冗余字段，便于首页渲染 */
  categoryName: string;
  minPriceCents: number;
  deliveryFeeCents: number;
  rating: number;
  monthlySales: number;
  isActive: boolean;
}

export interface Dish {
  id: number;
  shopId: number;
  name: string;
  imageUrl: string | null;
  priceCents: number;
  dishGroup: string;
  monthlySales: number;
  isActive: boolean;
}

/** 店铺详情：菜品按分组聚合（招牌/奶茶/果茶…），保持插入顺序 */
export type DishGroups = Record<string, Dish[]>;

export interface Address {
  id: number;
  userId: number;
  receiver: string;
  phone: string;
  building: string;
  room: string;
  isDefault: boolean;
}

export interface OrderItem {
  id: number;
  orderId: number;
  dishId: number;
  /** 快照：菜名/单价随单固化（CODEBUDDY §5 禁 JSON 明细） */
  dishName: string;
  unitPriceCents: number;
  quantity: number;
}

export interface Order {
  id: number;
  orderNo: string;
  userId: number;
  shopId: number;
  /** 列表接口带出的冗余字段 */
  shopName: string;
  /** 下单时地址快照（结构化四列，随单固化，只读展示） */
  receiver: string;
  phone: string;
  building: string;
  room: string;
  remark: string;
  totalCents: number;
  deliveryFeeCents: number;
  status: OrderStatus;
  createdAt: string;
  paidAt: string;
  acceptedAt: string | null;
  deliveredAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
}

export interface OrderWithItems extends Order {
  items: OrderItem[];
}

/** 统一响应壳（ARCHITECTURE §6） */
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

/** 统一分页结果 */
export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** 购物车条目（仅前端会话内使用，不落库） */
export interface CartItem {
  dishId: number;
  name: string;
  priceCents: number;
  quantity: number;
}
