// 订单详情（mockup order-detail.html：左订单信息 + 右出票进度时间线，SPEC F5.5）
import { useCallback, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { STATUS_TEXT, buildOrderTimeline } from "@xiaowei/shared";
import type { OrderWithItems } from "@xiaowei/shared";
import { ordersApi } from "../api/orders.js";
import { formatCents } from "../lib/money.js";

const STAMP_CLASS: Record<OrderWithItems["status"], string> = {
  paid: "stamp-paid",
  delivering: "stamp-deliv",
  completed: "stamp-done",
  cancelled: "stamp-cancel",
};

export function OrderDetailPage() {
  const { id } = useParams();
  const orderId = Number(id);
  const [searchParams] = useSearchParams();
  const justCreated = searchParams.get("created") === "1";
  const [order, setOrder] = useState<OrderWithItems | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    try {
      setOrder(await ordersApi.detail(orderId));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    }
  }, [orderId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleCancel(): Promise<void> {
    try {
      await ordersApi.cancel(orderId);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "取消失败");
    }
  }

  if (error !== null) {
    return (
      <div>
        <main className="container" style={{ paddingBlock: "var(--space-2xl)" }}>
          <p style={{ color: "var(--color-error)" }}>{error}</p>
          <Link to="/orders" style={{ color: "var(--color-accent)" }}>
            返回我的订单
          </Link>
        </main>
      </div>
    );
  }

  if (order === null) {
    return (
      <div>
        <main className="container" style={{ paddingBlock: "var(--space-2xl)", color: "var(--color-muted)" }}>
          加载中…
        </main>
      </div>
    );
  }

  const timeline = buildOrderTimeline(order);

  return (
    <div>
      <main className="container">
        {justCreated && (
          <p
            style={{
              marginBlock: "var(--space-lg)",
              padding: "var(--space-sm) var(--space-md)",
              border: "2px solid var(--color-ink)",
              background: "var(--st-done-bg)",
              color: "var(--st-done-ink)",
              fontWeight: 700,
            }}
          >
            出票成功！订单已进入待接单状态。
          </p>
        )}
        <div className="detail-grid">
          <div style={{ display: "grid", gap: "var(--space-lg)" }}>
            <p style={{ fontSize: "var(--text-sm)" }}>
              <Link to="/orders" style={{ color: "var(--color-accent)", textDecoration: "none" }}>
                &lt; 返回我的订单
              </Link>
            </p>

            <section className="panel">
              <h2 className="panel-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>
                  订单 #{order.orderNo.slice(-4)} · {order.shopName}
                </span>
                <span className={`stamp ${STAMP_CLASS[order.status]}`}>{STATUS_TEXT[order.status]}</span>
              </h2>
              <div className="panel-body">
                {order.items.map((item) => (
                  <div className="summary-line" key={item.id}>
                    <span>
                      {item.dishName} x{item.quantity}
                    </span>
                    <span className="price">{formatCents(item.unitPriceCents * item.quantity)}</span>
                  </div>
                ))}
                <div className="summary-line">
                  <span>配送费</span>
                  <span className="price">{formatCents(order.deliveryFeeCents)}</span>
                </div>
                <div className="summary-line summary-total">
                  <span>合计</span>
                  <span className="price price-big">{formatCents(order.totalCents)}</span>
                </div>
                <div className="summary-line" style={{ color: "var(--color-muted)" }}>
                  <span>收货地址</span>
                  <span>
                    {order.receiver} {maskPhone(order.phone)} · {order.building} {order.room}
                  </span>
                </div>
                {order.remark !== "" && (
                  <div className="summary-line" style={{ color: "var(--color-muted)" }}>
                    <span>备注</span>
                    <span>{order.remark}</span>
                  </div>
                )}
              </div>
            </section>
          </div>

          <aside className="panel" aria-label="订单进度">
            <h2 className="panel-head">出票进度</h2>
            <div className="panel-body">
              <ul className="timeline">
                {timeline.map((node) => (
                  <li key={node.title} className={node.done ? "on" : "dim"}>
                    <span className="t-dot" />
                    <div>
                      <div className="t-title">{node.title}</div>
                      <div className="t-time">{node.time ?? "未开始"}</div>
                    </div>
                  </li>
                ))}
              </ul>
              {order.status === "paid" && (
                <button className="btn btn-danger btn-sm" style={{ marginTop: "var(--space-md)" }} onClick={() => void handleCancel()}>
                  取消订单
                </button>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function maskPhone(phone: string): string {
  return phone.length === 11 ? `${phone.slice(0, 3)}****${phone.slice(7)}` : phone;
}
