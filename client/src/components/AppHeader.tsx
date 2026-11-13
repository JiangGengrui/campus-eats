import { useState } from "react";
import type { FormEvent } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/auth.js";
import { useCartStore } from "../stores/cart.js";

// 顶栏（mockup：品牌 + 搜索框 + 导航 + 购物车悬浮入口，SPEC F4.2）
export function AppHeader() {
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const cartCount = useCartStore((s) => s.items.reduce((sum, item) => sum + item.quantity, 0));
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("");

  function handleLogout(): void {
    clear();
    navigate("/login");
  }

  function handleSearch(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (keyword.trim().length > 0) {
      navigate(`/search?keyword=${encodeURIComponent(keyword.trim())}`);
    }
  }

  return (
    <header className="site-head">
      <div className="container site-head-in">
        <Link className="brand" to="/">
          <span className="brand-name">校味</span>
          <span className="brand-pix">CAMPUS EATS</span>
        </Link>
        <form className="search" onSubmit={handleSearch}>
          <input
            type="search"
            placeholder="搜索店名或菜名，比如：麻辣烫"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            aria-label="搜索店名或菜名"
          />
          <button type="submit">搜索</button>
        </form>
        <nav className="head-nav">
          <NavLink to="/" end>
            首页
          </NavLink>
          {user !== null && (
            <>
              <NavLink to="/orders">我的订单</NavLink>
              <NavLink to="/address">地址管理</NavLink>
            </>
          )}
          {user === null ? (
            <Link to="/login">登录</Link>
          ) : (
            <a
              href="#logout"
              onClick={(event) => {
                event.preventDefault();
                handleLogout();
              }}
            >
              退出
            </a>
          )}
          <Link className="cart-link" to={user === null ? "/login" : "/checkout"}>
            (cart) 购物车 {cartCount}
          </Link>
        </nav>
      </div>
    </header>
  );
}
