// 状态机单元测试：前后端唯一事实源的合法/非法迁移全覆盖
import { describe, expect, it } from "vitest";
import type { Order } from "./types.js";
import { ORDER_FLOW, ORDER_STATUSES, STATUS_TEXT, buildOrderTimeline, canTransition, isOrderStatus } from "./order-status.js";

describe("ORDER_FLOW 迁移表", () => {
  it("合法路径：paid → delivering → completed", () => {
    expect(canTransition("paid", "delivering")).toBe(true);
    expect(canTransition("delivering", "completed")).toBe(true);
  });

  it("paid 可取消；终态不可再迁移", () => {
    expect(canTransition("paid", "cancelled")).toBe(true);
    expect(canTransition("completed", "delivering")).toBe(false);
    expect(canTransition("cancelled", "paid")).toBe(false);
  });

  it("跳序推进全部被拒绝（SPEC F7.4）", () => {
    expect(canTransition("paid", "completed")).toBe(false);
    expect(canTransition("delivering", "cancelled")).toBe(false);
    expect(canTransition("delivering", "paid")).toBe(false);
  });

  it("每个状态声明的迁移都在 ORDER_FLOW 表内", () => {
    for (const status of ORDER_STATUSES) {
      for (const to of ORDER_FLOW[status]) {
        expect(ORDER_STATUSES).toContain(to);
      }
    }
  });
});

describe("isOrderStatus 类型守卫", () => {
  it("识别四态，拒绝其他值", () => {
    for (const s of ORDER_STATUSES) {
      expect(isOrderStatus(s)).toBe(true);
    }
    expect(isOrderStatus("pending")).toBe(false);
    expect(isOrderStatus(123)).toBe(false);
    expect(isOrderStatus(undefined)).toBe(false);
  });
});

describe("STATUS_TEXT 文案", () => {
  it("paid 显示为「待接单」（SPEC F5.1）", () => {
    expect(STATUS_TEXT.paid).toBe("待接单");
    expect(STATUS_TEXT.delivering).toBe("配送中");
    expect(STATUS_TEXT.completed).toBe("已完成");
    expect(STATUS_TEXT.cancelled).toBe("已取消");
  });
});

function timelineOrder(overrides: Partial<Pick<Order, "status" | "createdAt" | "paidAt" | "acceptedAt" | "deliveredAt" | "completedAt" | "cancelledAt">>) {
  return {
    status: "paid" as const,
    createdAt: "2026-11-01 10:00:00",
    paidAt: "2026-11-01 10:00:01",
    acceptedAt: null,
    deliveredAt: null,
    completedAt: null,
    cancelledAt: null,
    ...overrides,
  };
}

describe("buildOrderTimeline 五节点时间线", () => {
  it("待接单：前两节点完成，后三节点未完成", () => {
    const nodes = buildOrderTimeline(timelineOrder({}));
    expect(nodes.map((n) => n.title)).toEqual(["下单成功", "模拟支付完成", "店家接单", "配送中", "已送达（阶段二开放评价）"]);
    expect(nodes.map((n) => n.done)).toEqual([true, true, false, false, false]);
  });

  it("已接单未送达：配送中节点视为完成（done = acceptedAt || deliveredAt）", () => {
    const nodes = buildOrderTimeline(timelineOrder({ status: "delivering", acceptedAt: "2026-11-01 10:05:00" }));
    expect(nodes.map((n) => n.done)).toEqual([true, true, true, true, false]);
  });

  it("已完结：全节点完成", () => {
    const nodes = buildOrderTimeline(
      timelineOrder({
        status: "completed",
        acceptedAt: "2026-11-01 10:05:00",
        deliveredAt: "2026-11-01 10:20:00",
        completedAt: "2026-11-01 10:20:00",
      })
    );
    expect(nodes.every((n) => n.done)).toBe(true);
  });

  it("已取消：末节点为「已取消」且 time 取 cancelledAt", () => {
    const nodes = buildOrderTimeline(timelineOrder({ status: "cancelled", cancelledAt: "2026-11-01 10:03:00" }));
    expect(nodes).toHaveLength(5);
    const last = nodes[4]!;
    expect(last.title).toBe("已取消");
    expect(last.done).toBe(true);
    expect(last.time).toBe("2026-11-01 10:03:00");
  });
});
