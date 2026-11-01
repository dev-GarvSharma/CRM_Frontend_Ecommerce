import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import AdminSidebar from "./components/AdminSidebar.jsx";
import AdminTopbar from "./components/AdminTopbar.jsx";
import { Toast } from "./components/AdminPrimitives.jsx";
import Dashboard from "./pages/Dashboard/Dashboard.jsx";
import Products from "./pages/Products/Products.jsx";
import Orders from "./pages/Orders/Orders.jsx";
import Customers from "./pages/Customers/Customers.jsx";
import Categories from "./pages/Categories/Categories.jsx";
import Inventory from "./pages/Inventory/Inventory.jsx";
import Analytics from "./pages/Analytics/Analytics.jsx";
import Settings from "./pages/Settings/Settings.jsx";
import Marketing from "./pages/Marketing/Marketing.jsx";
import Access from "./pages/Access.jsx";
import Offers from "./pages/Offers.jsx";
import Promotions from "./pages/Promotions.jsx";
import Activity from "./pages/Activity.jsx";
import AbandonedCarts from "./pages/AbandonedCarts.jsx";
import ContactMessages from "./pages/ContactMessages.jsx";
import Blogs from "./pages/Blogs.jsx";
import Notifications from "./pages/Notifications/Notifications.jsx";
import Auth from "../pages/Auth.jsx";
import { isAdminAccount, logout as requestLogout } from "../api/auth.js";
import { get } from "./app/axiosWrapper.js";
import LocalStorageService from "./services/localStorageService.js";
import "./admin.css";

export default function AdminApp() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");
  const [currentUser, setCurrentUser] = useState(LocalStorageService.getUserData());
  const isLoginRoute = location.pathname === "/admin/login";
  const isAuthenticatedAdmin = Boolean(
    LocalStorageService.getAccessToken() &&
      isAdminAccount(LocalStorageService.getUserData()),
  );

  useEffect(() => {
    if (isLoginRoute || !LocalStorageService.getAccessToken()) return;
    get("auth/me").then((result) => {
      const user = result.data?.data;
      if (result.success && isAdminAccount(user)) {
        setCurrentUser(user);
        LocalStorageService.setUserData(user);
      } else if (result.status === 403 || (result.success && !isAdminAccount(user))) {
        LocalStorageService.clearAuthData();
        setCurrentUser(null);
      }
    });
  }, [isLoginRoute]);

  useEffect(() => {
    const previousTitle = document.title;
    const section =
      location.pathname.split("/").filter(Boolean).at(-1) || "overview";
    document.title = `${section[0].toUpperCase()}${section.slice(1)} | CRM Admin`;
    return () => {
      document.title = previousTitle;
    };
  }, [location.pathname]);

  useEffect(() => {
    const shortcut = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        document.querySelector(".admin-topbar .admin-search input")?.focus();
      }
      if (
        event.key === "/" &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(
          document.activeElement?.tagName,
        )
      ) {
        event.preventDefault();
        document.querySelector(".admin-topbar .admin-search input")?.focus();
      }
    };
    const help = () =>
      setToast("Support is available at help@cuppanord.example");
    window.addEventListener("keydown", shortcut);
    window.addEventListener("admin:help", help);
    return () => {
      window.removeEventListener("keydown", shortcut);
      window.removeEventListener("admin:help", help);
    };
  }, []);

  if (isLoginRoute) {
    return <Routes><Route path="/admin/login" element={<Auth adminMode />} /><Route path="*" element={<Navigate to="/admin/login" replace />} /></Routes>;
  }

  if (!isAuthenticatedAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  const signOut = async () => {
    await requestLogout();
    LocalStorageService.clearAuthData();
    setCurrentUser(null);
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className={`admin-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      <AdminSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={collapsed}
        onToggle={() => setCollapsed((value) => !value)}
        user={currentUser}
        onLogout={signOut}
      />
      <div className="admin-main">
        <AdminTopbar
          onMenu={() => setSidebarOpen((value) => !value)}
          onSearch={setSearch}
          search={search}
          menuOpen={sidebarOpen}
          user={currentUser}
        />
        <main className="admin-content">
          <Routes>
            <Route
              path="/admin"
              element={<Dashboard globalSearch={search} onNotify={setToast} />}
            />
            <Route
              path="/admin/products"
              element={<Products globalSearch={search} onNotify={setToast} />}
            />
            <Route
              path="/admin/orders"
              element={<Orders globalSearch={search} onNotify={setToast} />}
            />
            <Route
              path="/admin/customers"
              element={<Customers globalSearch={search} onNotify={setToast} />}
            />
            <Route
              path="/admin/categories"
              element={<Categories globalSearch={search} onNotify={setToast} />}
            />
            <Route
              path="/admin/inventory"
              element={<Inventory globalSearch={search} onNotify={setToast} />}
            />
            <Route
              path="/admin/analytics"
              element={<Analytics onNotify={setToast} />}
            />
            <Route
              path="/admin/settings"
              element={<Settings onNotify={setToast} />}
            />
            <Route
              path="/admin/marketing"
              element={<Marketing globalSearch={search} onNotify={setToast} />}
            />
            <Route
              path="/admin/access"
              element={<Access globalSearch={search} onNotify={setToast} />}
            />
            <Route path="/admin/coupons" element={<Offers globalSearch={search} onNotify={setToast} />} />
            <Route path="/admin/offers" element={<Navigate to="/admin/coupons" replace />} />
            <Route path="/admin/promotions" element={<Promotions globalSearch={search} onNotify={setToast} />} />
            <Route path="/admin/activity" element={<Activity globalSearch={search} onNotify={setToast} />} />
            <Route path="/admin/abandoned-carts" element={<AbandonedCarts globalSearch={search} onNotify={setToast} />} />
            <Route path="/admin/contact-messages" element={<ContactMessages globalSearch={search} onNotify={setToast} />} />
            <Route path="/admin/blogs" element={<Blogs globalSearch={search} onNotify={setToast} />} />
            <Route path="/admin/notifications" element={<Notifications globalSearch={search} onNotify={setToast} />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </main>
      </div>
      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
