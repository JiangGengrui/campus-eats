// 我的订单列表（mockup orders.html：五状态 tab + 订单卡片，SPEC F5.4/F5.6）
import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { OrderStatus, OrderWithItems } from "@xiaowei/shared";
import { STATUS_TEXT } from "@xiaowei/shared";
import { ordersApi } from "../api/orders.js";
import { formatCents } from "../lib/money.js";

const TABS: { key: OrderStatus | "all"; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "paid", label: "待接单" },
  { key: "delivering", label: "配送中" },
  { key: "completed", label: "已完成" },
  { key: "cancelled", label: "已取消" },
];

const STAMP_CLASS: Record<OrderStatus, string> = {
  paid: "stamp-paid",
  delivering: "stamp-deliv",
  completed: "stamp-done",
  cancelled: "stamp-cancel",
};

export function OrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const active = (searchParams.get("status") ?? "all") as OrderStatus | "all";
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const result = await ordersApi.list({ status: active, pageSize: 50 });
      setOrders(result.list);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [active]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleCancel(id: number): Promise<void> {
    try {
      await ordersApi.cancel(id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "取消失败");
    }
  }

  return (
    <div>
      <main className="container" style={{ paddingBlock: "var(--space-xl)" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-2xl)", marginBottom: "var(--space-lg)" }}>
          我的订单
        </h1>

        <nav className="tabs" aria-label="订单状态筛选">
          {TABS.map((tab) => (
            <a
              key={tab.key}
              className="tab"
              href={`?status=${tab.key}`}
              aria-current={active === tab.key}
              onClick={(event) => {
                event.preventDefault();
                setSearchParams(tab.key === "all" ? {} : { status: tab.key });
              }}
            >
              {tab.label}
            </a>
          ))}
        </nav>

        {error !== null && <p style={{ color: "var(--color-error)", marginBottom: "var(--space-md)" }}>{error}</p>}
        {loading ? (
          <p style={{ color: "var(--color-muted)" }}>加载中…</p>
        ) : orders.length === 0 ? (
          <p style={{ color: "var(--color-muted)" }}>这个状态下还没有订单。</p>
        ) : (
          orders.map((order) => (
            <article className="order-card" key={order.id} style={order.status === "cancelled" ? { opacity: 0.75 } : undefined}>
              <div className="order-card-top">
                <div>
                  <span className="order-shop">{order.shopName}</span>{" "}
                  <span className="order-no">#{order.orderNo.slice(-4)}</span>
                </div>
                <span className={`stamp ${STAMP_CLASS[order.status]}`}>{STATUS_TEXT[order.status]}</span>
              </div>
              <p className="order-items">{order.items.map((item) => `${item.dishName}x${item.quantity}`).join("、")}</p>
              <div className="order-card-foot">
                <span style={{ fontSize: "var(--text-sm)" }}>
                  合计 <span className="price">{formatCents(order.totalCents)}</span> · {order.createdAt}
                </span>
                <span style={{ display: "flex", gap: "var(--space-sm)" }}>
                  {order.status === "paid" && (
                    <button className="btn btn-sm btn-danger" onClick={() => void handleCancel(order.id)}>
                      取消订单
                    </button>
                  )}
                  <Link className="btn btn-sm btn-ghost" to={`/orders/${order.id}`}>
                    查看详情
                  </Link>
                </span>
              </div>
            </article>
          ))
        )}
      </main>
    </div>
  );
}
