// 确认订单页（mockup checkout.html：左表单 + 右订单摘要，SPEC F5.2/F5.3）
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Address } from "@xiaowei/shared";
import { addressApi } from "../api/addresses.js";
import { ordersApi } from "../api/orders.js";
import { formatCents } from "../lib/money.js";
import { useCartStore } from "../stores/cart.js";

export function CheckoutPage() {
  const navigate = useNavigate();
  const items = useCartStore((s) => s.items);
  const shopName = useCartStore((s) => s.shopName);
  const shopId = useCartStore((s) => s.shopId);
  const clearCart = useCartStore((s) => s.clear);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [remark, setRemark] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const subtotalCents = items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);

  useEffect(() => {
    addressApi
      .list()
      .then((list) => {
        setAddresses(list);
        const defaultAddress = list.find((address) => address.isDefault) ?? list[0];
        if (defaultAddress !== undefined) {
          setSelectedId(defaultAddress.id);
        }
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "加载失败"))
      .finally(() => setLoading(false));
  }, []);

  /** 模拟支付（SPEC F5.3）：前端防重 submitting + 后端订单号幂等 */
  async function handlePay(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (items.length === 0 || selectedId === null || submitting) {
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const result = await ordersApi.create({
        addressId: selectedId,
        remark,
        items: items.map((item) => ({ dishId: item.dishId, quantity: item.quantity })),
      });
      clearCart();
      navigate(`/orders/${result.orderId}?created=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "支付失败");
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div>
        <main className="container" style={{ paddingBlock: "var(--space-2xl)", color: "var(--color-muted)" }}>
          加载中…
        </main>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div>
        <main className="container" style={{ paddingBlock: "var(--space-2xl)" }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-2xl)" }}>购物车是空的</h1>
          <p style={{ color: "var(--color-muted)", marginBlock: "var(--space-md)" }}>
            先去挑一家店，加几样想吃的吧。
          </p>
          <Link className="btn" to={shopId !== null ? `/shop/${shopId}` : "/"}>
            回去逛逛
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div>
      <main className="container">
        <div className="checkout-grid">
          <div style={{ display: "grid", gap: "var(--space-lg)" }}>
            <p style={{ fontSize: "var(--text-sm)" }}>
              <Link to={`/shop/${shopId ?? ""}`} style={{ color: "var(--color-accent)", textDecoration: "none" }}>
                &lt; 返回{shopName}
              </Link>
            </p>

            <section className="panel">
              <h2 className="panel-head">收货地址</h2>
              <div className="panel-body">
                {addresses.length === 0 ? (
                  <p style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)" }}>
                    还没有收货地址，
                    <Link to="/address" style={{ color: "var(--color-accent)" }}>
                      去新增一个
                    </Link>
                    。
                  </p>
                ) : (
                  addresses.map((address) => (
                    <label className={`addr-opt${selectedId === address.id ? " checked" : ""}`} key={address.id}>
                      <input
                        type="radio"
                        name="addr"
                        checked={selectedId === address.id}
                        onChange={() => setSelectedId(address.id)}
                      />
                      <span>
                        <span className="addr-name">{address.receiver}</span>{" "}
                        <span className="addr-tel">{maskPhone(address.phone)}</span>
                        {address.isDefault && <span className="tag">默认</span>}
                        <br />
                        <span style={{ fontSize: "var(--text-sm)", color: "var(--color-ink-2)" }}>
                          {address.building} {address.room}
                        </span>
                      </span>
                    </label>
                  ))
                )}
              </div>
            </section>

            <section className="panel">
              <h2 className="panel-head">订单备注</h2>
              <div className="panel-body">
                <div className="field">
                  <label htmlFor="remark">给店家或配送的话（选填）</label>
                  <textarea
                    id="remark"
                    rows={2}
                    maxLength={100}
                    placeholder="比如：珍珠换椰果，放楼下货架第三层"
                    value={remark}
                    onChange={(event) => setRemark(event.target.value)}
                  />
                </div>
              </div>
            </section>

            <form onSubmit={(event) => void handlePay(event)}>
              <button
                className="btn"
                type="submit"
                disabled={submitting || selectedId === null}
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                {submitting ? "出票中…" : `(coin) 模拟支付 ${formatCents(subtotalCents)}`}
              </button>
              {error !== null && (
                <p style={{ marginTop: "var(--space-sm)", fontSize: "var(--text-sm)", color: "var(--color-error)" }}>
                  {error}
                </p>
              )}
            </form>
          </div>

          <aside className="panel" aria-label="订单摘要">
            <h2 className="panel-head">订单摘要 · {shopName}</h2>
            <div className="panel-body">
              {items.map((item) => (
                <div className="summary-line" key={item.dishId}>
                  <span>
                    {item.name} x{item.quantity}
                  </span>
                  <span className="price">{formatCents(item.priceCents * item.quantity)}</span>
                </div>
              ))}
              <div className="summary-line">
                <span>配送费</span>
                <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>以下单结算为准</span>
              </div>
              <div className="summary-line summary-total">
                <span>合计</span>
                <span className="price price-big">{formatCents(subtotalCents)}</span>
              </div>
              <p style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>
                以商家现价结算 · 支付即出票，票号可在订单页查询
              </p>
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
