// 订单业务规则：事务化下单、状态机推进（SPEC F5 / ARCHITECTURE §5）
import type { Order, OrderItem, OrderStatus, OrderWithItems, PageResult } from "@xiaowei/shared";
import type { createOrderSchema } from "@xiaowei/shared";
import { ERROR_CODES, canTransition } from "@xiaowei/shared";
import type { z } from "zod";
import { db } from "../../db/connection.js";
import { AppError, notFound } from "../../errors.js";
import { getAddress } from "../addresses/addresses.repo.js";
import { getActiveDishById, getActiveShop } from "../shops/shops.repo.js";
import { beijingYmd } from "../../utils/time.js";
import * as repo from "./orders.repo.js";

type CreateOrderInput = z.infer<typeof createOrderSchema>;

function generateOrderNo(): string {
  const random = String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
  return `${beijingYmd()}${random}`;
}

function isUniqueViolation(err: unknown): boolean {
  return (err as { code?: string }).code === "SQLITE_CONSTRAINT_UNIQUE";
}

export function createOrder(
  userId: number,
  input: CreateOrderInput
): { orderId: number; orderNo: string; totalCents: number } {
  const create = db.transaction(() => {
    // 1. 地址校验（SPEC F5.2）
    const address = getAddress(input.addressId, userId);
    if (address === undefined) {
      throw notFound(ERROR_CODES.ADDRESS_NOT_FOUND);
    }

    // 2. 菜品有效性校验：在售、属于同一店铺（SPEC F5.3 修订版：不建模库存）
    const resolved = input.items.map((item) => {
      const dish = getActiveDishById(item.dishId);
      if (dish === undefined) {
        throw new AppError(ERROR_CODES.DISH_UNAVAILABLE, `「菜品#${item.dishId}」已下架，请重新确认`, 400);
      }
      return { item, dish };
    });
    const shopId = resolved[0]?.dish.shopId;
    if (shopId === undefined || resolved.some(({ dish }) => dish.shopId !== shopId)) {
      throw new AppError(ERROR_CODES.DISH_UNAVAILABLE, "只能下单同一店铺的菜品", 400);
    }
    const shop = getActiveShop(shopId);
    if (shop === undefined) {
      throw notFound(ERROR_CODES.SHOP_NOT_FOUND);
    }

    // 3. 金额以数据库现价结算（不信任前端，SPEC F4.4）；INTEGER 分无浮点误差
    const subtotalCents = resolved.reduce((sum, { item, dish }) => sum + dish.priceCents * item.quantity, 0);
    if (subtotalCents < shop.minPriceCents) {
      throw new AppError(ERROR_CODES.BELOW_MIN_PRICE, `未达到 ${shop.name} 的起送价`, 400);
    }
    const totalCents = subtotalCents + shop.deliveryFeeCents;

    // 4. 订单号唯一冲突重试（ARCHITECTURE §4 契约3）
    let orderNo: string | null = null;
    let orderId: number | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        orderNo = generateOrderNo();
        orderId = repo.insertOrder({
          orderNo,
          userId,
          shopId,
          receiver: address.receiver,
          phone: address.phone,
          building: address.building,
          room: address.room,
          remark: input.remark,
          totalCents,
          deliveryFeeCents: shop.deliveryFeeCents,
        });
        break;
      } catch (err) {
        if (!isUniqueViolation(err)) {
          throw err;
        }
      }
    }
    if (orderId === null || orderNo === null) {
      throw new Error("订单号生成冲突，请重试");
    }

    // 5. 明细快照（CODEBUDDY §5：结构化逐行，禁 JSON）
    for (const { item, dish } of resolved) {
      repo.insertItem(orderId, {
        dishId: dish.id,
        dishName: dish.name,
        unitPriceCents: dish.priceCents,
        quantity: item.quantity,
      });
    }

    return { orderId, orderNo, totalCents };
  });
  return create();
}

/** 一次批量取回明细并按订单分组，替代逐单查询（N+1 → 2 次查询） */
function attachItems(orders: Order[]): OrderWithItems[] {
  const items = repo.listItemsByOrderIds(orders.map((order) => order.id));
  const grouped = new Map<number, OrderItem[]>();
  for (const item of items) {
    const list = grouped.get(item.orderId) ?? [];
    list.push(item);
    grouped.set(item.orderId, list);
  }
  return orders.map((order) => ({ ...order, items: grouped.get(order.id) ?? [] }));
}

export function listOrders(
  userId: number,
  status: OrderStatus | null,
  page: number,
  pageSize: number
): PageResult<OrderWithItems> {
  const list = repo.listByUser(userId, status, pageSize, (page - 1) * pageSize);
  const total = repo.countByUser(userId, status);
  return {
    list: attachItems(list),
    total,
    page,
    pageSize,
  };
}

export function getOrderDetail(userId: number, id: number): OrderWithItems {
  const order = repo.getByIdAndUser(id, userId);
  if (order === undefined) {
    // 非本人订单按不存在处理（SPEC F5.7）
    throw notFound(ERROR_CODES.NOT_FOUND);
  }
  return { ...order, items: repo.listItemsByOrder(order.id) };
}

export function cancelOrder(userId: number, id: number): void {
  const order = repo.getByIdAndUser(id, userId);
  if (order === undefined) {
    throw notFound(ERROR_CODES.NOT_FOUND);
  }
  // 仅 paid（待接单）可取消（SPEC F5.6）：先校验状态机，再条件更新
  if (!canTransition(order.status, "cancelled") || !repo.transition(id, order.status, "cancelled")) {
    throw new AppError(ERROR_CODES.INVALID_TRANSITION, undefined, 409);
  }
}

export function transitionOrder(id: number, to: OrderStatus): void {
  const order = repo.getById(id);
  if (order === undefined) {
    throw notFound(ERROR_CODES.NOT_FOUND);
  }
  if (!canTransition(order.status, to)) {
    throw new AppError(ERROR_CODES.INVALID_TRANSITION, undefined, 409);
  }
  if (!repo.transition(id, order.status, to)) {
    // 并发下状态已被他人推进
    throw new AppError(ERROR_CODES.INVALID_TRANSITION, undefined, 409);
  }
}

/** P1.2 自动接单：取最老的一单按状态机推进（供 index.ts 定时器调用，推进入口仍唯一） */
export function autoAdvanceOldestOrder(): boolean {
  const order = repo.findOldestActive();
  if (order === undefined) {
    return false;
  }
  const to: OrderStatus = order.status === "paid" ? "delivering" : "completed";
  return repo.transition(order.id, order.status, to);
}

export function listOrdersForAdmin(
  status: OrderStatus | null,
  page: number,
  pageSize: number
): PageResult<OrderWithItems> {
  const list = repo.listForAdmin(status, pageSize, (page - 1) * pageSize);
  const total = repo.countForAdmin(status);
  return {
    list: attachItems(list),
    total,
    page,
    pageSize,
  };
}
