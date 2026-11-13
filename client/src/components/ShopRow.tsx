import { Link } from "react-router-dom";
import type { Shop } from "@xiaowei/shared";
import { formatCents } from "../lib/money.js";

// 店铺信息行（mockup index.html V2：logo 槽 | 名称+元信息 | 箭头）
export function ShopRow({ shop, badge }: { shop: Shop; badge?: { text: string; stampClass: string } }) {
  return (
    <Link className="shop-row" to={`/shop/${shop.id}`}>
      <div className="logo-slot" data-slot style={{ width: 96, height: 72 }}>
        <span className="slot-label">{shop.name} logo</span>
      </div>
      <div>
        <div className="shop-name">
          {shop.name}
          {badge !== undefined && <span className={`stamp ${badge.stampClass}`} style={{ marginLeft: 8 }}>{badge.text}</span>}
        </div>
        <div className="shop-meta">
          <span>月售 {shop.monthlySales}</span>
          <span>{formatCents(shop.minPriceCents)} 起送</span>
          <span>配送 {formatCents(shop.deliveryFeeCents)}</span>
          <span>{shop.rating} 分</span>
        </div>
      </div>
      <span className="go">&gt;</span>
    </Link>
  );
}
