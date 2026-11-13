// 订单状态机：前后端唯一事实源（ARCHITECTURE §5）
// 前端按钮显隐与后端推进校验都必须引用 ORDER_FLOW，禁止在别处硬编码状态迁移。
import type { Order } from "./types.js";

export type OrderStatus = "paid" | "delivering" | "completed" | "cancelled";

export const ORDER_STATUSES: readonly OrderStatus[] = ["paid", "delivering", "completed", "cancelled"];

/** 合法迁移表：paid(待接单) → delivering(配送中) → completed；paid → cancelled */
export const ORDER_FLOW: Record<OrderStatus, readonly OrderStatus[]> = {
  paid: ["delivering", "cancelled"],
  delivering: ["completed"],
  completed: [],
  cancelled: [],
};

/** 用户端展示文案（SPEC F5.1：paid 显示为"待接单"） */
export const STATUS_TEXT: Record<OrderStatus, string> = {
  paid: "待接单",
  delivering: "配送中",
  completed: "已完成",
  cancelled: "已取消",
};

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" && (ORDER_STATUSES as readonly string[]).includes(value);
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_FLOW[from].includes(to);
}

/** 订单状态时间线（SPEC F5.5 / mockup order-detail：五个节点） */
export interface OrderTimelineNode {
  title: string;
  time: string | null;
  done: boolean;
}

type TimelineOrder = Pick<
  Order,
  "status" | "createdAt" | "paidAt" | "acceptedAt" | "deliveredAt" | "completedAt" | "cancelledAt"
>;

export function buildOrderTimeline(order: TimelineOrder): OrderTimelineNode[] {
  const nodes: OrderTimelineNode[] = [
    { title: "下单成功", time: order.createdAt, done: true },
    { title: "模拟支付完成", time: order.paidAt, done: order.paidAt !== null },
    { title: "店家接单", time: order.acceptedAt, done: order.acceptedAt !== null },
    // 配送中：已接单即视为进入配送阶段；时间点为送达时刻（若有）
    {
      title: "配送中",
      time: order.deliveredAt,
      done: order.acceptedAt !== null || order.deliveredAt !== null,
    },
  ];
  if (order.status === "cancelled") {
    nodes.push({ title: "已取消", time: order.cancelledAt, done: true });
  } else {
    nodes.push({ title: "已送达（阶段二开放评价）", time: order.completedAt, done: order.completedAt !== null });
  }
  return nodes;
}
