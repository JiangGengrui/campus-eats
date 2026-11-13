// 店铺管理（mockup admin-shops.html：筛选 + 表格 + 编辑表单，SPEC F7.3/F7.5）
import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { Shop, ShopCategory } from "@xiaowei/shared";
import { adminApi, type ShopUpsertInput } from "../../api/admin.js";
import { formatCents, yuanToCents } from "../../lib/money.js";

const emptyForm = {
  name: "",
  categoryId: 0,
  description: "",
  minPriceYuan: "10",
  deliveryFeeYuan: "1",
  logoUrl: null as string | null,
  isActive: true,
};

export function AdminShopsPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [categories, setCategories] = useState<ShopCategory[]>([]);
  const [keyword, setKeyword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);

  // 请求序号：过期响应直接丢弃，避免旧结果覆盖新筛选（防抖场景下的竞态）
  const searchSeq = useRef(0);

  const refresh = useCallback(async (): Promise<void> => {
    const seq = ++searchSeq.current;
    try {
      const [shopList, categoryList] = await Promise.all([
        adminApi.listShops(keyword.trim() === "" ? {} : { keyword: keyword.trim() }),
        adminApi.listCategories(),
      ]);
      if (seq !== searchSeq.current) {
        return;
      }
      setShops(shopList);
      setCategories(categoryList);
      setError(null);
    } catch (err) {
      if (seq !== searchSeq.current) {
        return;
      }
      setError(err instanceof Error ? err.message : "加载失败");
    }
  }, [keyword]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void refresh();
    }, 300); // 搜索防抖 300ms
    return () => clearTimeout(timer);
  }, [refresh]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const minPriceCents = yuanToCents(form.minPriceYuan);
    const deliveryFeeCents = yuanToCents(form.deliveryFeeYuan);
    if (minPriceCents === null || deliveryFeeCents === null) {
      setError("起送价/配送费必须是数字");
      return;
    }
    const input: ShopUpsertInput = {
      name: form.name,
      categoryId: form.categoryId || categories[0]?.id || 0,
      description: form.description,
      minPriceCents,
      deliveryFeeCents,
      logoUrl: form.logoUrl,
      isActive: form.isActive,
    };
    try {
      if (editingId === null) {
        await adminApi.createShop(input);
      } else {
        await adminApi.updateShop(editingId, input);
      }
      setEditingId(null);
      setForm(emptyForm);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    }
  }

  async function toggleActive(shop: Shop): Promise<void> {
    try {
      await adminApi.setShopActive(shop.id, !shop.isActive);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    }
  }

  return (
    <div>
      {error !== null && <p style={{ color: "var(--color-error)", marginBottom: "var(--space-md)" }}>{error}</p>}

      <div className="filters">
        <input
          type="search"
          placeholder="搜店名"
          aria-label="搜店名"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
        />
        <button className="btn btn-sm" style={{ marginLeft: "auto" }} onClick={() => { setEditingId(null); setForm(emptyForm); }}>
          + 新增店铺
        </button>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>店铺</th><th>分类</th><th>起送价</th><th>配送费</th><th>月销量</th><th>状态</th><th>操作</th>
          </tr>
        </thead>
        <tbody>
          {shops.map((shop) => (
            <tr key={shop.id}>
              <td style={{ fontWeight: 700 }}>{shop.name}</td>
              <td>{shop.categoryName}</td>
              <td>{formatCents(shop.minPriceCents)}</td>
              <td>{formatCents(shop.deliveryFeeCents)}</td>
              <td>{shop.monthlySales}</td>
              <td>
                <span className={`stamp ${shop.isActive ? "stamp-done" : "stamp-cancel"}`}>
                  {shop.isActive ? "营业中" : "已下架"}
                </span>
              </td>
              <td>
                <div className="ops">
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      setEditingId(shop.id);
                      setForm({
                        name: shop.name,
                        categoryId: shop.categoryId,
                        description: shop.description,
                        minPriceYuan: String(shop.minPriceCents / 100),
                        deliveryFeeYuan: String(shop.deliveryFeeCents / 100),
                        logoUrl: shop.logoUrl,
                        isActive: shop.isActive,
                      });
                    }}
                  >
                    编辑
                  </button>
                  <button className={`btn btn-sm ${shop.isActive ? "btn-danger" : ""}`} onClick={() => void toggleActive(shop)}>
                    {shop.isActive ? "下架" : "重新上架"}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="panel" style={{ maxWidth: 560, marginTop: "var(--space-xl)" }}>
        <h2 className="panel-head">{editingId === null ? "新增店铺" : `编辑店铺 #${editingId}`}</h2>
        <div className="panel-body">
          <form onSubmit={(event) => void handleSubmit(event)}>
            <div className="field">
              <label htmlFor="shop-name">店名</label>
              <input id="shop-name" value={form.name} required maxLength={30}
                onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="shop-category">分类</label>
              <select id="shop-category" value={form.categoryId}
                onChange={(event) => setForm({ ...form, categoryId: Number(event.target.value) })}
                style={{ border: "2px solid var(--color-ink)", padding: "var(--space-xs) var(--space-sm)" }}>
                {categories.map((category) => (
                  <option value={category.id} key={category.id}>{category.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="shop-desc">描述</label>
              <input id="shop-desc" value={form.description} maxLength={200}
                onChange={(event) => setForm({ ...form, description: event.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="shop-min">起送价（元）</label>
              <input id="shop-min" value={form.minPriceYuan} inputMode="decimal"
                onChange={(event) => setForm({ ...form, minPriceYuan: event.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="shop-fee">配送费（元）</label>
              <input id="shop-fee" value={form.deliveryFeeYuan} inputMode="decimal"
                onChange={(event) => setForm({ ...form, deliveryFeeYuan: event.target.value })} />
            </div>
            <label style={{ display: "flex", gap: "var(--space-2xs)", alignItems: "center", fontSize: "var(--text-sm)" }}>
              <input type="checkbox" checked={form.isActive}
                onChange={(event) => setForm({ ...form, isActive: event.target.checked })} />
              营业中
            </label>
            <button className="btn" type="submit" style={{ justifySelf: "start" }}>保存店铺</button>
          </form>
        </div>
      </section>

      <p style={{ marginTop: "var(--space-lg)", fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>
        已有历史订单的店铺只能下架（软删除），不能物理删除。分类管理：在下方新增/删除分类，被店铺引用的分类不可删。
      </p>

      <CategoryPanel onChanged={() => void refresh()} />
    </div>
  );
}

function CategoryPanel({ onChanged }: { onChanged: () => void }) {
  const [categories, setCategories] = useState<ShopCategory[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function refresh(): Promise<void> {
    setCategories(await adminApi.listCategories());
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <section className="panel" style={{ maxWidth: 560, marginTop: "var(--space-xl)" }}>
      <h2 className="panel-head">分类管理</h2>
      <div className="panel-body">
        <div className="chips">
          {categories.map((category) => (
            <span className="chip" key={category.id} style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
              {category.name}
              <a
                href="#del"
                aria-label={`删除分类 ${category.name}`}
                style={{ color: "var(--color-error)", textDecoration: "none" }}
                onClick={(event) => {
                  event.preventDefault();
                  adminApi
                    .deleteCategory(category.id)
                    .then(async () => {
                      await refresh();
                      onChanged();
                    })
                    .catch((err: unknown) => setError(err instanceof Error ? err.message : "删除失败"));
                }}
              >
                ×
              </a>
            </span>
          ))}
        </div>
        <div style={{ display: "flex", gap: "var(--space-sm)", marginTop: "var(--space-sm)" }}>
          <input placeholder="新分类名，如：水果" value={name} maxLength={10}
            onChange={(event) => setName(event.target.value)} style={{ border: "2px solid var(--color-ink)", padding: "var(--space-2xs) var(--space-sm)" }} />
          <button
            className="btn btn-sm"
            type="button"
            onClick={() => {
              adminApi
                .createCategory(name)
                .then(async () => {
                  setName("");
                  await refresh();
                  onChanged();
                })
                .catch((err: unknown) => setError(err instanceof Error ? err.message : "新增失败"));
            }}
          >
            新增分类
          </button>
        </div>
        {error !== null && <p style={{ fontSize: "var(--text-xs)", color: "var(--color-error)" }}>{error}</p>}
      </div>
    </section>
  );
}
