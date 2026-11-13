// 首页（mockup index.html：出票口 hero + 分类大入口 + 左分类边栏店铺列表）
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { Shop, ShopCategory } from "@xiaowei/shared";
import { shopsApi } from "../api/shops.js";
import { ShopRow } from "../components/ShopRow.js";

const CATEGORY_GLYPHS: Record<string, string> = {
  奶茶: "茶",
  快餐: "锅",
  面食: "面",
  烧烤: "串",
  甜品: "果",
  简餐: "饭",
};

export function HomePage() {
  const [searchParams] = useSearchParams();
  const activeCategory = searchParams.get("categoryId");
  const [categories, setCategories] = useState<ShopCategory[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    shopsApi
      .categories()
      .then(setCategories)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "加载失败"));
  }, []);

  useEffect(() => {
    setLoading(true);
    shopsApi
      .list(activeCategory === null ? undefined : Number(activeCategory))
      .then(setShops)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "加载失败"))
      .finally(() => setLoading(false));
  }, [activeCategory]);

  return (
    <div>
      <section className="hero">
        <div className="container hero-in">
          <div>
            <h1>
              宿舍楼下，
              <br />
              热乎的已经出票。
            </h1>
            <p>校内店铺入驻，从奶茶到拉面，点单像撕一张饭票一样快。</p>
            <div className="hero-cta">
              <a className="btn" href="#shops" onClick={(event) => { event.preventDefault(); document.getElementById("shops")?.scrollIntoView(); }}>
                先逛逛店铺
              </a>
              <Link className="btn btn-ghost" to="/orders">
                看我的订单
              </Link>
            </div>
          </div>
          <div className="hero-ticket" aria-label="点单小票示意">
            <div className="hero-ticket-head">
              <span>校味 NO.1024</span>
              <span>今天想吃点什么？</span>
            </div>
            {shops.slice(0, 3).map((shop) => (
              <div className="ticket-line" key={shop.id}>
                <span>{shop.name}</span>
                <span className="price">{shop.rating} 分</span>
              </div>
            ))}
            <div className="hero-ticket-total">
              <span>月销第一</span>
              <span className="price price-big">{shops[0]?.name ?? "虚位以待"}</span>
            </div>
          </div>
        </div>
      </section>

      <main className="container" style={{ paddingBlock: "var(--space-xl)" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-xl)", marginBottom: "var(--space-lg)" }}>
          今天想吃点什么？
        </h2>
        <div className="cat-grid">
          {categories.map((category) => (
            <Link className="cat-tile" to={`/search?keyword=${encodeURIComponent(category.name)}`} key={category.id}>
              <span className="glyph">{CATEGORY_GLYPHS[category.name] ?? "食"}</span>
              {category.name}
            </Link>
          ))}
        </div>

        <h2 id="shops" style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-xl)", margin: "var(--space-2xl) 0 var(--space-lg)" }}>
          全部店铺
        </h2>
        {error !== null && <p style={{ color: "var(--color-error)" }}>{error}</p>}
        <div className="board">
          <aside className="board-side" aria-label="店铺分类">
            <div className="board-side-title">分类</div>
            <Link to="/" aria-current={activeCategory === null}>
              全部
            </Link>
            {categories.map((category) => (
              <Link
                key={category.id}
                to={`/?categoryId=${category.id}`}
                aria-current={activeCategory === String(category.id)}
              >
                {category.name}
              </Link>
            ))}
          </aside>
          <div className="shop-list">
            {loading ? (
              <p style={{ color: "var(--color-muted)" }}>加载中…</p>
            ) : shops.length === 0 ? (
              <p style={{ color: "var(--color-muted)" }}>该分类下暂无营业中的店铺。</p>
            ) : (
              shops.map((shop) => <ShopRow shop={shop} key={shop.id} />)
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
