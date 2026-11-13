// 搜索结果页（mockup search.html：店名 + 菜名混合命中，含空状态）
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { shopsApi, type SearchResult } from "../api/shops.js";
import { ShopRow } from "../components/ShopRow.js";
import { formatCents } from "../lib/money.js";

export function SearchPage() {
  const [searchParams] = useSearchParams();
  const keyword = searchParams.get("keyword") ?? "";
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    shopsApi
      .search(keyword)
      .then(setResult)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "搜索失败"))
      .finally(() => setLoading(false));
  }, [keyword]);

  const isEmpty = result !== null && result.shops.length === 0 && result.dishes.length === 0;

  return (
    <div>
      <main className="container" style={{ paddingBlock: "var(--space-xl)" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-2xl)", marginBottom: "var(--space-sm)" }}>
          「{keyword}」的搜索结果
        </h1>
        <p style={{ color: "var(--color-muted)", fontSize: "var(--text-sm)", marginBottom: "var(--space-xl)" }}>
          {loading
            ? "搜索中…"
            : `找到 ${result?.shops.length ?? 0} 家店铺、${result?.dishes.length ?? 0} 个菜品。命中菜名的会标出所属店铺。`}
        </p>

        {error !== null && <p style={{ color: "var(--color-error)" }}>{error}</p>}

        <div className="shop-list" style={{ maxWidth: 860 }}>
          {result?.shops.map((shop) => (
            <ShopRow shop={shop} key={`shop-${shop.id}`} badge={{ text: "店铺", stampClass: "stamp-paid" }} />
          ))}
          {result?.dishes.map((dish) => (
            <Link className="shop-row" to={`/shop/${dish.shopId}`} key={`dish-${dish.id}`}>
              <div className="logo-slot" data-slot style={{ width: 96, height: 72 }}>
                <span className="slot-label">菜品图</span>
              </div>
              <div>
                <div className="shop-name">
                  {dish.name}
                  <span className="stamp stamp-done" style={{ marginLeft: 8 }}>
                    菜品 · {dish.shopName}
                  </span>
                </div>
                <div className="shop-meta">
                  <span>月售 {dish.monthlySales}</span>
                  <span>{formatCents(dish.priceCents)} / 份</span>
                </div>
              </div>
              <span className="go">&gt;</span>
            </Link>
          ))}
        </div>

        {isEmpty && (
          <div
            style={{
              marginTop: "var(--space-xl)",
              border: "2px dashed var(--color-rule)",
              padding: "var(--space-lg)",
              textAlign: "center",
              color: "var(--color-muted)",
              fontSize: "var(--text-sm)",
            }}
          >
            未找到相关店铺或菜品，换个词试试，比如：奶茶、水饺。
          </div>
        )}
      </main>
    </div>
  );
}
