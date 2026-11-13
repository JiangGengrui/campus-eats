import { Link } from "react-router-dom";
import { formatCents } from "../lib/money.js";
import { useAuthStore } from "../stores/auth.js";
import { useCartStore } from "../stores/cart.js";

// 店铺详情右侧常驻购物车（mockup shop.html V1，SPEC F4.2）
export function CartPanel() {
  const items = useCartStore((s) => s.items);
  const shopName = useCartStore((s) => s.shopName);
  const clearCart = useCartStore((s) => s.clear);
  const user = useAuthStore((s) => s.user);

  const totalCents = items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);

  return (
    <aside className="cart-panel" aria-label="购物车">
      <div className="cart-panel-head">
        <span>购物车{shopName !== "" ? ` · ${shopName}` : ""}</span>
        <button
          className="btn-ghost btn btn-sm"
          style={{ boxShadow: "none", border: "1.5px solid var(--color-rule)" }}
          onClick={clearCart}
          disabled={items.length === 0}
        >
          清空
        </button>
      </div>
      <div className="cart-panel-body">
        {items.length === 0 ? (
          <p style={{ fontSize: "var(--text-sm)", color: "var(--color-muted)" }}>还没选菜，点右侧 + 开始加购。</p>
        ) : (
          items.map((item) => (
            <div className="cart-line" key={item.dishId}>
              <span>
                {item.name} x{item.quantity}
              </span>
              <span className="price">{formatCents(item.priceCents * item.quantity)}</span>
            </div>
          ))
        )}
      </div>
      <div className="cart-panel-foot">
        <div className="summary-line summary-total">
          <span>合计</span>
          <span className="price price-big">{formatCents(totalCents)}</span>
        </div>
        {user === null ? (
          <Link className="btn" to="/login?redirect=%2Fcheckout" aria-disabled={items.length === 0}>
            登录后去结算
          </Link>
        ) : (
          <Link className="btn" to="/checkout" aria-disabled={items.length === 0}>
            去结算
          </Link>
        )}
        <p style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)", textAlign: "center" }}>
          加入其他店铺菜品会先清空本购物车
        </p>
      </div>
    </aside>
  );
}
