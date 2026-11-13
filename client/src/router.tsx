// 路由表 + 守卫（ARCHITECTURE §3）
import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import { AppFooter } from "./components/AppFooter.js";
import { AppHeader } from "./components/AppHeader.js";
import { RequireAdmin } from "./components/RequireAdmin.js";
import { RequireAuth } from "./components/RequireAuth.js";
import { AdminLayout } from "./components/AdminLayout.js";
import { AddressPage } from "./pages/AddressPage.js";
import { CheckoutPage } from "./pages/CheckoutPage.js";
import { HomePage } from "./pages/HomePage.js";
import { OrderDetailPage } from "./pages/OrderDetailPage.js";
import { OrdersPage } from "./pages/OrdersPage.js";
import { AdminOrdersPage } from "./pages/admin/AdminOrdersPage.js";
import { AdminDishesPage } from "./pages/admin/AdminDishesPage.js";
import { AdminShopsPage } from "./pages/admin/AdminShopsPage.js";
import { LoginPage } from "./pages/LoginPage.js";
import { SearchPage } from "./pages/SearchPage.js";
import { ShopPage } from "./pages/ShopPage.js";

function Layout() {
  return (
    <div>
      <AppHeader />
      <Outlet />
      <AppFooter />
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "login", element: <LoginPage /> },
      { path: "search", element: <SearchPage /> },
      { path: "shop/:id", element: <ShopPage /> },
      {
        path: "address",
        element: (
          <RequireAuth>
            <AddressPage />
          </RequireAuth>
        ),
      },
      {
        path: "checkout",
        element: (
          <RequireAuth>
            <CheckoutPage />
          </RequireAuth>
        ),
      },
      {
        path: "orders",
        element: (
          <RequireAuth>
            <OrdersPage />
          </RequireAuth>
        ),
      },
      {
        path: "orders/:id",
        element: (
          <RequireAuth>
            <OrderDetailPage />
          </RequireAuth>
        ),
      },
    ],
  },
  {
    path: "/admin",
    element: (
      <RequireAdmin>
        <AdminLayout />
      </RequireAdmin>
    ),
    children: [
      { index: true, element: <Navigate to="/admin/orders" replace /> },
      { path: "orders", element: <AdminOrdersPage /> },
      { path: "shops", element: <AdminShopsPage /> },
      { path: "dishes", element: <AdminDishesPage /> },
    ],
  },
]);
