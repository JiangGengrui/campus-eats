// 菜品管理（mockup admin-dishes.html：店铺/分类筛选 + 表格 + 编辑表单，SPEC F7.4）
import { useCallback, useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import type { Dish, Shop } from "@xiaowei/shared";
import { adminApi, type DishUpsertInput } from "../../api/admin.js";
import { formatCents, yuanToCents } from "../../lib/money.js";

const emptyForm = {
  shopId: 0,
  name: "",
  dishGroup: "招牌",
  priceYuan: "10",
  imageUrl: null as string | null,
  isActive: true,
};

export function AdminDishesPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [shopId, setShopId] = useState<number | null>(null);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const [shopList, dishList] = await Promise.all([adminApi.listShops(), adminApi.listDishes(shopId ?? undefined)]);
      setShops(shopList);
      setDishes(dishList);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    }
  }, [shopId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleUpload(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    if (file === undefined) {
      return;
    }
    setUploading(true);
    try {
      const { url } = await adminApi.uploadImage(file);
      setForm((prev) => ({ ...prev, imageUrl: url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "上传失败");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const priceCents = yuanToCents(form.priceYuan);
    if (priceCents === null) {
      setError("价格必须是数字");
      return;
    }
    const targetShopId = form.shopId || shops[0]?.id || 0;
    const input: DishUpsertInput = {
      shopId: targetShopId,
      name: form.name,
      dishGroup: form.dishGroup,
      priceCents,
      imageUrl: form.imageUrl,
      isActive: form.isActive,
    };
    try {
      if (editingId === null) {
        await adminApi.createDish(input);
      } else {
        await adminApi.updateDish(editingId, input);
      }
      setEditingId(null);
      setForm(emptyForm);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    }
  }

  async function toggleActive(dish: Dish): Promise<void> {
    try {
      await adminApi.setDishActive(dish.id, !dish.isActive);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    }
  }

  const shopName = (id: number): string => shops.find((shop) => shop.id === id)?.name ?? `#${id}`;

  return (
    <div>
      {error !== null && <p style={{ color: "var(--color-error)", marginBottom: "var(--space-md)" }}>{error}</p>}

      <div className="filters">
        <select aria-label="按店铺筛选" value={shopId ?? ""} onChange={(event) => setShopId(event.target.value === "" ? null : Number(event.target.value))}>
          <option value="">全部店铺</option>
          {shops.map((shop) => (
            <option value={shop.id} key={shop.id}>{shop.name}</option>
          ))}
        </select>
        <button className="btn btn-sm" style={{ marginLeft: "auto" }} onClick={() => { setEditingId(null); setForm(emptyForm); }}>
          + 新增菜品
        </button>
      </div>

      <table className="table">
        <thead>
          <tr><th>菜品</th><th>店铺</th><th>分类</th><th>价格</th><th>月销量</th><th>状态</th><th>操作</th></tr>
        </thead>
        <tbody>
          {dishes.map((dish) => (
            <tr key={dish.id}>
              <td style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", fontWeight: 700 }}>
                <span className="thumb-slot" data-slot><span className="slot-label">图</span></span>
                {dish.name}
              </td>
              <td>{shopName(dish.shopId)}</td>
              <td>{dish.dishGroup}</td>
              <td>{formatCents(dish.priceCents)}</td>
              <td>{dish.monthlySales}</td>
              <td>
                <span className={`stamp ${dish.isActive ? "stamp-done" : "stamp-cancel"}`}>{dish.isActive ? "在售" : "已下架"}</span>
              </td>
              <td>
                <div className="ops">
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      setEditingId(dish.id);
                      setForm({
                        shopId: dish.shopId,
                        name: dish.name,
                        dishGroup: dish.dishGroup,
                        priceYuan: String(dish.priceCents / 100),
                        imageUrl: dish.imageUrl,
                        isActive: dish.isActive,
                      });
                    }}
                  >
                    编辑
                  </button>
                  <button className={`btn btn-sm ${dish.isActive ? "btn-danger" : ""}`} onClick={() => void toggleActive(dish)}>
                    {dish.isActive ? "下架" : "重新上架"}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="panel" style={{ maxWidth: 560, marginTop: "var(--space-xl)" }}>
        <h2 className="panel-head">{editingId === null ? "新增菜品" : `编辑菜品 #${editingId}`}</h2>
        <div className="panel-body">
          <form onSubmit={(event) => void handleSubmit(event)}>
            <div className="field">
              <label htmlFor="dish-shop">所属店铺</label>
              <select id="dish-shop" value={form.shopId || shops[0]?.id || 0}
                onChange={(event) => setForm({ ...form, shopId: Number(event.target.value) })}
                style={{ border: "2px solid var(--color-ink)", padding: "var(--space-xs) var(--space-sm)" }}>
                {shops.map((shop) => (
                  <option value={shop.id} key={shop.id}>{shop.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="dish-name">菜名</label>
              <input id="dish-name" value={form.name} required maxLength={30}
                onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="dish-group">菜品分类</label>
              <input id="dish-group" value={form.dishGroup} required maxLength={20} placeholder="比如：招牌 / 奶茶 / 小食"
                onChange={(event) => setForm({ ...form, dishGroup: event.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="dish-price">价格（元）</label>
              <input id="dish-price" value={form.priceYuan} inputMode="decimal"
                onChange={(event) => setForm({ ...form, priceYuan: event.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="dish-image">菜品图片（jpg/png/webp，≤2MB）</label>
              <input id="dish-image" type="file" accept=".jpg,.jpeg,.png,.webp" onChange={(event) => void handleUpload(event)} />
              {uploading && <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}> 上传中…</span>}
              {form.imageUrl !== null && (
                <span style={{ fontSize: "var(--text-xs)", color: "var(--color-muted)" }}> 已选：{form.imageUrl}</span>
              )}
            </div>
            <label style={{ display: "flex", gap: "var(--space-2xs)", alignItems: "center", fontSize: "var(--text-sm)" }}>
              <input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} />
              在售
            </label>
            <button className="btn" type="submit" style={{ justifySelf: "start" }}>保存菜品</button>
          </form>
        </div>
      </section>
    </div>
  );
}
