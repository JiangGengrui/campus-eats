// 地址管理页（mockup address.html：地址卡片网格 + 新增/编辑表单）
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { Address } from "@xiaowei/shared";
import { addressApi, type AddressInput } from "../api/addresses.js";

const emptyForm: AddressInput = { receiver: "", phone: "", building: "", room: "", isDefault: false };

export function AddressPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [form, setForm] = useState<AddressInput>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh(): Promise<void> {
    setAddresses(await addressApi.list());
  }

  useEffect(() => {
    refresh()
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "加载失败"))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    try {
      if (editingId === null) {
        await addressApi.create(form);
      } else {
        await addressApi.update(editingId, form);
      }
      setForm(emptyForm);
      setEditingId(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    }
  }

  async function handleSetDefault(id: number): Promise<void> {
    await addressApi.setDefault(id);
    await refresh();
  }

  async function handleRemove(id: number): Promise<void> {
    await addressApi.remove(id);
    await refresh();
  }

  function startEdit(address: Address): void {
    setEditingId(address.id);
    setForm({
      receiver: address.receiver,
      phone: address.phone,
      building: address.building,
      room: address.room,
      isDefault: address.isDefault,
    });
  }

  return (
    <div>
      <main className="container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "var(--space-xl)" }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-2xl)" }}>收货地址</h1>
          <button
            className="btn btn-sm"
            onClick={() => {
              setEditingId(null);
              setForm(emptyForm);
            }}
          >
            + 新增地址
          </button>
        </div>

        {loading ? (
          <p style={{ padding: "var(--space-xl) 0", color: "var(--color-muted)" }}>加载中…</p>
        ) : (
          <div className="addr-grid">
            {addresses.map((address) => (
              <article className="addr-card" key={address.id}>
                <div className="row">
                  <span className="addr-name">{address.receiver}</span>
                  <span className="addr-tel">{maskPhone(address.phone)}</span>
                  {address.isDefault && <span className="tag">默认</span>}
                </div>
                <p style={{ fontSize: "var(--text-sm)", color: "var(--color-ink-2)" }}>
                  {address.building} {address.room}
                </p>
                <div className="row" style={{ marginTop: "var(--space-2xs)" }}>
                  {!address.isDefault && (
                    <button className="btn btn-ghost btn-sm" onClick={() => void handleSetDefault(address.id)}>
                      设为默认
                    </button>
                  )}
                  <button className="btn btn-ghost btn-sm" onClick={() => startEdit(address)}>
                    编辑
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => void handleRemove(address.id)}>
                    删除
                  </button>
                </div>
              </article>
            ))}
            {addresses.length === 0 && (
              <p style={{ color: "var(--color-muted)", gridColumn: "1 / -1" }}>还没有收货地址，先新增一个吧。</p>
            )}
          </div>
        )}

        <section className="panel" style={{ maxWidth: 560, marginBlock: "var(--space-xl)" }}>
          <h2 className="panel-head">{editingId === null ? "新增地址" : `编辑地址 #${editingId}`}</h2>
          <div className="panel-body">
            <form onSubmit={(event) => void handleSubmit(event)}>
              <div className="field">
                <label htmlFor="receiver">收货人</label>
                <input id="receiver" value={form.receiver} required maxLength={20}
                  onChange={(event) => setForm({ ...form, receiver: event.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="phone">电话</label>
                <input id="phone" value={form.phone} required inputMode="numeric" placeholder="11 位手机号"
                  onChange={(event) => setForm({ ...form, phone: event.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="building">宿舍楼</label>
                <input id="building" value={form.building} required maxLength={30} placeholder="比如：1 号宿舍楼"
                  onChange={(event) => setForm({ ...form, building: event.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="room">房间号</label>
                <input id="room" value={form.room} required maxLength={30} placeholder="比如：302（楼下货架自取）"
                  onChange={(event) => setForm({ ...form, room: event.target.value })} />
              </div>
              <label style={{ display: "flex", gap: "var(--space-2xs)", alignItems: "center", fontSize: "var(--text-sm)" }}>
                <input type="checkbox" checked={form.isDefault}
                  onChange={(event) => setForm({ ...form, isDefault: event.target.checked })} />
                设为默认地址
              </label>
              {error !== null && (
                <p style={{ fontSize: "var(--text-xs)", color: "var(--color-error)" }}>{error}</p>
              )}
              <div style={{ display: "flex", gap: "var(--space-sm)" }}>
                <button className="btn" type="submit">保存地址</button>
                {editingId !== null && (
                  <button className="btn btn-ghost" type="button"
                    onClick={() => {
                      setEditingId(null);
                      setForm(emptyForm);
                    }}>
                    取消编辑
                  </button>
                )}
              </div>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}

function maskPhone(phone: string): string {
  return phone.length === 11 ? `${phone.slice(0, 3)}****${phone.slice(7)}` : phone;
}
