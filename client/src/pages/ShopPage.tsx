// 店铺详情三栏（mockup shop.html V1：分类导航 | 菜品 | 购物车常驻）
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { Dish, DishGroups, Shop } from "@xiaowei/shared";
import { shopsApi } from "../api/shops.js";
import { CartPanel } from "../components/CartPanel.js";
import { formatCents } from "../lib/money.js";
import { useCartStore } from "../stores/cart.js";

export function ShopPage() {
  const { id } = useParams();
  const shopId = Number(id);
  const [shop, setShop] = useState<Shop | null>(null);
  const [dishGroups, setDishGroups] = useState<DishGroups>({});
  const [activeGroup, setActiveGroup] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const addDish = useCartStore((s) => s.addDish);
  const replaceCart = useCartStore((s) => s.replaceCart);

  useEffect(() => {
    shopsApi
      .detail(shopId)
      .then((detail) => {
        setShop(detail.shop);
        setDishGroups(detail.dishGroups);
        const firstGroup = Object.keys(detail.dishGroups)[0];
        if (firstGroup !== undefined) {
          setActiveGroup(firstGroup);
        }
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "加载失败"));
  }, [shopId]);

  /** 跨店加菜确认弹窗（SPEC F4.1） */
  function handleAdd(dish: Dish): void {
    const shopLabel = shop?.name ?? "";
    const result = addDish(shopId, shopLabel, dish);
    if (result === "confirm") {
      const confirmed = window.confirm("购物车中已有其他店铺的菜品，确认清空并加入当前店铺吗？");
      if (confirmed) {
        replaceCart(shopId, shopLabel, dish);
      }
    }
  }

  if (error !== null) {
    return (
      <div>
        <main className="container" style={{ paddingBlock: "var(--space-2xl)" }}>
          <p style={{ color: "var(--color-error)" }}>{error}</p>
          <Link to="/" style={{ color: "var(--color-accent)" }}>
            返回首页
          </Link>
        </main>
      </div>
    );
  }

  if (shop === null) {
    return (
      <div>
        <main className="container" style={{ paddingBlock: "var(--space-2xl)", color: "var(--color-muted)" }}>
          加载中…
        </main>
      </div>
    );
  }

  const groupNames = Object.keys(dishGroups);

  return (
    <div>
      <section className="shop-banner">
        <div className="container shop-banner-in">
          <div className="banner-slot" data-slot style={{ height: 168 }}>
            <span className="slot-label" data-keep>
              店铺头图（后台上传）
            </span>
          </div>
          <div>
            <h1 className="shop-title">{shop.name}</h1>
            <div className="shop-sub">
              <span>月售 {shop.monthlySales}</span>
              <span>起送 {formatCents(shop.minPriceCents)}</span>
              <span>配送 {formatCents(shop.deliveryFeeCents)}</span>
              <span>预计 30 分钟</span>
              <span>{shop.rating} 分（暂无评价，阶段二开放）</span>
            </div>
          </div>
        </div>
      </section>

      <main className="container menu-wrap">
        <nav className="menu-nav" aria-label="菜品分类">
          {groupNames.map((group) => (
            <a
              key={group}
              href={`#group-${group}`}
              aria-current={activeGroup === group}
              onClick={() => setActiveGroup(group)}
            >
              {group}
            </a>
          ))}
        </nav>

        <div>
          {groupNames.map((group) => (
            <section key={group}>
              <h2 className="dish-group-title" id={`group-${group}`} style={{ marginTop: "var(--space-lg)" }}>
                {group}
              </h2>
              {dishGroups[group]?.map((dish) => (
                <div className="dish-row" key={dish.id}>
                  <div className="dish-slot" data-slot>
                    <span className="slot-label">菜品图</span>
                  </div>
                  <div>
                    <div className="dish-name">{dish.name}</div>
                    <div className="dish-meta">月售 {dish.monthlySales}</div>
                  </div>
                  <div className="dish-buy">
                    <span className="price">{formatCents(dish.priceCents)}</span>
                    <button className="add-one" aria-label={`加入购物车：${dish.name}`} onClick={() => handleAdd(dish)}>
                      +
                    </button>
                  </div>
                </div>
              ))}
            </section>
          ))}
          {groupNames.length === 0 && (
            <p style={{ color: "var(--color-muted)" }}>该店铺还没有上架菜品。</p>
          )}
        </div>

        <CartPanel />
      </main>
    </div>
  );
}
