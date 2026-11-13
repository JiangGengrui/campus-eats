// 购物车 store：单店模型，会话内不持久化（SPEC F4.1/F4.3）
import { create } from "zustand";
import type { CartItem, Dish } from "@xiaowei/shared";

interface CartState {
  shopId: number | null;
  shopName: string;
  items: CartItem[];
  /** 返回 true 表示已加入；返回 "confirm" 表示跨店需要用户确认后调 replaceCart */
  addDish: (shopId: number, shopName: string, dish: Dish) => boolean | "confirm";
  replaceCart: (shopId: number, shopName: string, dish: Dish) => void;
  changeQuantity: (dishId: number, delta: number) => void;
  clear: () => void;
  totalCount: () => number;
  totalCents: () => number;
}

function toItem(dish: Dish): CartItem {
  return { dishId: dish.id, name: dish.name, priceCents: dish.priceCents, quantity: 1 };
}

export const useCartStore = create<CartState>((set, get) => ({
  shopId: null,
  shopName: "",
  items: [],

  addDish: (shopId, shopName, dish) => {
    const state = get();
    if (state.shopId !== null && state.shopId !== shopId && state.items.length > 0) {
      return "confirm"; // 跨店加菜需确认（SPEC F4.1）
    }
    const items = [...state.items];
    const existing = items.find((item) => item.dishId === dish.id);
    if (existing !== undefined) {
      existing.quantity += 1;
    } else {
      items.push(toItem(dish));
    }
    set({ shopId, shopName, items });
    return true;
  },

  // 跨店确认后的替换：清空原购物车再加入新菜（SPEC F4.1「确认后原购物车被替换」）
  replaceCart: (shopId, shopName, dish) => {
    set({ shopId, shopName, items: [toItem(dish)] });
  },

  changeQuantity: (dishId, delta) => {
    const items = get()
      .items.map((item) => (item.dishId === dishId ? { ...item, quantity: item.quantity + delta } : item))
      .filter((item) => item.quantity > 0); // 减至 0 移除（SPEC F4.2）
    set({ items, shopId: items.length === 0 ? null : get().shopId, shopName: items.length === 0 ? "" : get().shopName });
  },

  clear: () => set({ shopId: null, shopName: "", items: [] }),

  totalCount: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
  totalCents: () => get().items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0),
}));
