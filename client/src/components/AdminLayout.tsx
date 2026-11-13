import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/auth.js";

// 后台壳：左导航 + 右内容（PROTOTYPE_DECISIONS 决策 C）
export function AdminLayout() {
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const navigate = useNavigate();

  return (
    <div className="admin">
      <aside className="admin-side">
        <Link className="brand" to="/admin/orders" style={{ textDecoration: "none" }}>
          <span className="brand-name">校味</span>
          <span className="brand-pix">ADMIN</span>
        </Link>
        <NavLink to="/admin/orders">订单管理</NavLink>
        <NavLink to="/admin/shops">店铺管理</NavLink>
        <NavLink to="/admin/dishes">菜品管理</NavLink>
      </aside>
      <main className="admin-main">
        <div className="admin-top">
          <h1>管理后台</h1>
          <div className="admin-user">
            <span>管理员 {user?.username ?? ""}</span>
            <a
              href="#logout"
              onClick={(event) => {
                event.preventDefault();
                clear();
                navigate("/login?admin=1");
              }}
            >
              退出
            </a>
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
