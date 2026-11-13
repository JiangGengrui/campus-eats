// 订单数据访问（参数化 SQL）
import { db } from "../../db/connection.js";
import type { Order, OrderItem, OrderStatus } from "@xiaowei/shared";

interface OrderRow {
  id: number;
  order_no: string;
  user_id: number;
  shop_id: number;
  shop_name: string;
  receiver: string;
  phone: string;
  building: string;
  room: string;
  remark: string;
  total_cents: number;
  delivery_fee_cents: number;
  status: OrderStatus;
  created_at: string;
  paid_at: string;
  accepted_at: string | null;
  delivered_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
}

interface ItemRow {
  id: number;
  order_id: number;
  dish_id: number;
  dish_name: string;
  unit_price_cents: number;
  quantity: number;
}

function toOrder(row: OrderRow): Order {
  return {
    id: row.id,
    orderNo: row.order_no,
    userId: row.user_id,
    shopId: row.shop_id,
    shopName: row.shop_name,
    receiver: row.receiver,
    phone: row.phone,
    building: row.building,
    room: row.room,
    remark: row.remark,
    totalCents: row.total_cents,
    deliveryFeeCents: row.delivery_fee_cents,
    status: row.status,
    createdAt: row.created_at,
    paidAt: row.paid_at,
    acceptedAt: row.accepted_at,
    deliveredAt: row.delivered_at,
    completedAt: row.completed_at,
    cancelledAt: row.cancelled_at,
  };
}

function toItem(row: ItemRow): OrderItem {
  return {
    id: row.id,
    orderId: row.order_id,
    dishId: row.dish_id,
    dishName: row.dish_name,
    unitPriceCents: row.unit_price_cents,
    quantity: row.quantity,
  };
}

const insertOrderStmt = db.prepare(`
  INSERT INTO orders (order_no, user_id, shop_id, receiver, phone, building, room, remark, total_cents, delivery_fee_cents, status)
  VALUES (@orderNo, @userId, @shopId, @receiver, @phone, @building, @room, @remark, @totalCents, @deliveryFeeCents, 'paid')`);
const insertItemStmt = db.prepare(`
  INSERT INTO order_items (order_id, dish_id, dish_name, unit_price_cents, quantity)
  VALUES (@orderId, @dishId, @dishName, @unitPriceCents, @quantity)`);
const listByUserStmt = db.prepare(`
  SELECT o.*, s.name AS shop_name FROM orders o JOIN shops s ON s.id = o.shop_id
  WHERE o.user_id = @userId AND (@status IS NULL OR o.status = @status)
  ORDER BY o.id DESC LIMIT @limit OFFSET @offset`);
const countByUserStmt = db.prepare(
  "SELECT COUNT(*) AS n FROM orders WHERE user_id = @userId AND (@status IS NULL OR status = @status)"
);
const getByIdAndUserStmt = db.prepare(`
  SELECT o.*, s.name AS shop_name FROM orders o JOIN shops s ON s.id = o.shop_id
  WHERE o.id = @id AND o.user_id = @userId`);
const getByIdStmt = db.prepare("SELECT o.*, s.name AS shop_name FROM orders o JOIN shops s ON s.id = o.shop_id WHERE o.id = @id");
const itemsByOrderStmt = db.prepare("SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC");
const transitionStmt = db.prepare(
  "UPDATE orders SET status = @to, accepted_at = CASE WHEN @to = 'delivering' THEN datetime('now','+8 hours') ELSE accepted_at END, delivered_at = CASE WHEN @to = 'completed' THEN datetime('now','+8 hours') ELSE delivered_at END, completed_at = CASE WHEN @to = 'completed' THEN datetime('now','+8 hours') ELSE completed_at END, cancelled_at = CASE WHEN @to = 'cancelled' THEN datetime('now','+8 hours') ELSE cancelled_at END WHERE id = @id AND status = @from"
);
const listForAdminStmt = db.prepare(`
  SELECT o.*, s.name AS shop_name FROM orders o JOIN shops s ON s.id = o.shop_id
  WHERE (@status IS NULL OR o.status = @status)
  ORDER BY o.id DESC LIMIT @limit OFFSET @offset`);
const countForAdminStmt = db.prepare("SELECT COUNT(*) AS n FROM orders WHERE (@status IS NULL OR status = @status)");

export interface NewOrderInput {
  orderNo: string;
  userId: number;
  shopId: number;
  receiver: string;
  phone: string;
  building: string;
  room: string;
  remark: string;
  totalCents: number;
  deliveryFeeCents: number;
}

export function insertOrder(input: NewOrderInput): number {
  return Number(insertOrderStmt.run(input).lastInsertRowid);
}

export function insertItem(orderId: number, item: { dishId: number; dishName: string; unitPriceCents: number; quantity: number }): void {
  insertItemStmt.run({ orderId, dishId: item.dishId, dishName: item.dishName, unitPriceCents: item.unitPriceCents, quantity: item.quantity });
}

export function listByUser(userId: number, status: OrderStatus | null, limit: number, offset: number): Order[] {
  return (listByUserStmt.all({ userId, status, limit, offset }) as OrderRow[]).map(toOrder);
}

export function countByUser(userId: number, status: OrderStatus | null): number {
  return (countByUserStmt.get({ userId, status }) as { n: number }).n;
}

export function getByIdAndUser(id: number, userId: number): Order | undefined {
  const row = getByIdAndUserStmt.get({ id, userId }) as OrderRow | undefined;
  return row === undefined ? undefined : toOrder(row);
}

export function getById(id: number): Order | undefined {
  const row = getByIdStmt.get({ id }) as OrderRow | undefined;
  return row === undefined ? undefined : toOrder(row);
}

export function listItemsByOrder(orderId: number): OrderItem[] {
  return (itemsByOrderStmt.all(orderId) as ItemRow[]).map(toItem);
}

const oldestActiveStmt = db.prepare(
  "SELECT id, status FROM orders WHERE status IN ('paid','delivering') ORDER BY id ASC LIMIT 1"
);

/** 最老的一单活跃订单（P1.2 自动接单用） */
export function findOldestActive(): { id: number; status: OrderStatus } | undefined {
  return oldestActiveStmt.get() as { id: number; status: OrderStatus } | undefined;
}

/** 批量取多订单明细（避免列表页 N+1）：占位符数量由 ids 长度决定，不含用户输入 */
export function listItemsByOrderIds(orderIds: number[]): OrderItem[] {
  if (orderIds.length === 0) {
    return [];
  }
  const placeholders = orderIds.map(() => "?").join(",");
  const stmt = db.prepare(`SELECT * FROM order_items WHERE order_id IN (${placeholders}) ORDER BY id ASC`);
  return (stmt.all(...orderIds) as ItemRow[]).map(toItem);
}

/** 条件更新：影响 0 行即状态已变化（幂等/并发保护，ARCHITECTURE §5） */
export function transition(id: number, from: OrderStatus, to: OrderStatus): boolean {
  return transitionStmt.run({ id, from, to }).changes > 0;
}

export function listForAdmin(status: OrderStatus | null, limit: number, offset: number): Order[] {
  return (listForAdminStmt.all({ status, limit, offset }) as OrderRow[]).map(toOrder);
}

export function countForAdmin(status: OrderStatus | null): number {
  return (countForAdminStmt.get({ status }) as { n: number }).n;
}
