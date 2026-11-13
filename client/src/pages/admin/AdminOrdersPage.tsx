// 订单看板（mockup admin-orders.html：四列 = 状态机四态；P1.3 每列独立分页）
import { useCallback, useEffect, useRef, useState } from "react";
import { ORDER_FLOW, ORDER_STATUSES, STATUS_TEXT } from "@xiaowei/shared";
import type { OrderStatus, OrderWithItems, PageResult } from "@xiaowei/shared";
import { adminApi } from "../../api/admin.js";
import { formatCents } from "../../lib/money.js";

const PAGE_SIZE = 10;

interface ColumnState {
  result: PageResult<OrderWithItems> | null;
  page: number;
  loading: boolean;
}

function KanbanColumn({
  status,
  refreshKey,
  onChanged,
  onError,
}: {
  status: OrderStatus;
  refreshKey: number;
  onChanged: () => void;
  onError: (message: string) => void;
}) {
  const [state, setState] = useState<ColumnState>({ result: null, page: 1, loading: true });
  // 用 ref 跟踪最新页码：refreshKey 变化触发重取时不丢失当前分页位置
  const pageRef = useRef(1);

  const refresh = useCallback(
    async (page: number): Promise<void> => {
      pageRef.current = page;
      try {
        const result = await adminApi.listOrders({ status, page, pageSize: PAGE_SIZE });
        setState({ result, page, loading: false });
      } catch (err) {
        onError(err instanceof Error ? err.message : "加载失败");
        setState((prev) => ({ ...prev, loading: false }));
      }
    },
    [status, onError]
  );

  useEffect(() => {
    void refresh(pageRef.current);
  }, [refresh, refreshKey]);

  async function handleTransition(order: OrderWithItems, to: OrderStatus): Promise<void> {
    try {
      await adminApi.transition(order.id, to);
      // 父级 bump refreshKey，四列各自按当前页重取（不再整组重挂载）
      onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : "推进失败");
    }
  }

  const orders = state.result?.list ?? [];
  const total = state.result?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <section className="kan-col" aria-label={STATUS_TEXT[status]}>
      <header className="kan-head">
        <span>{STATUS_TEXT[status]}</span>
        <span className="kan-count">({total})</span>
      </header>
      <div className="kan-body">
        {state.loading && <p style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>加载中…</p>}
        {!state.loading && orders.length === 0 && (
          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>暂无订单</p>
        )}
        {orders.map((order) => (
          <article className="kan-card" key={order.id}>
            <div className="kc-top">
              <span>#{order.orderNo.slice(-4)}</span>
              <span>{order.shopName}</span>
            </div>
            <div className="kc-sub">
              <span>{order.receiver}</span>
              <span className="price">{formatCents(order.totalCents)}</span>
            </div>
            <div className="kc-sub">
              <span>{order.items.map((item) => `${item.dishName}x${item.quantity}`).join("、")}</span>
            </div>
            {ORDER_FLOW[status].includes("delivering") && (
              <button className="btn btn-sm" style={{ width: "100%" }} onClick={() => void handleTransition(order, "delivering")}>
                接单
              </button>
            )}
            {ORDER_FLOW[status].includes("completed") && (
              <button className="btn btn-sm" style={{ width: "100%" }} onClick={() => void handleTransition(order, "completed")}>
                送达
              </button>
            )}
            {ORDER_FLOW[status].includes("cancelled") && (
              <button className="btn btn-sm btn-danger" style={{ width: "100%" }} onClick={() => void handleTransition(order, "cancelled")}>
                取消订单
              </button>
            )}
            {ORDER_FLOW[status].length === 0 && (
              <button className="btn btn-sm btn-ghost" style={{ width: "100%" }} disabled>
                已完结
              </button>
            )}
          </article>
        ))}
        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-xs)" }}>
            <button
              className="btn btn-sm btn-ghost"
              style={{ boxShadow: "none" }}
              disabled={state.page <= 1}
              onClick={() => void refresh(state.page - 1)}
            >
              上一页
            </button>
            <span style={{ color: "var(--color-muted)", alignSelf: "center" }}>
              {state.page}/{totalPages}
            </span>
            <button
              className="btn btn-sm btn-ghost"
              style={{ boxShadow: "none" }}
              disabled={state.page >= totalPages}
              onClick={() => void refresh(state.page + 1)}
            >
              下一页
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

export function AdminOrdersPage() {
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div>
      {error !== null && <p style={{ color: "var(--color-error)", marginBottom: "var(--space-md)" }}>{error}</p>}
      <div className="kanban">
        {ORDER_STATUSES.map((status) => (
          <KanbanColumn
            status={status}
            key={status}
            refreshKey={refreshKey}
            onChanged={() => setRefreshKey((key) => key + 1)}
            onError={setError}
          />
        ))}
      </div>
      <p style={{ marginTop: "var(--space-lg)", fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>
        状态只能按 待接单 → 配送中 → 已完成 顺序推进；待接单可取消。跳序推进会被后端拒绝（3001）。
      </p>
    </div>
  );
}
