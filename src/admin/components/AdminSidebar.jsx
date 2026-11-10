import { NavLink } from "react-router-dom";
import {
  Activity,
  BarChart3,
  Boxes,
  BookOpen,
  ChevronLeft,
  CircleHelp,
  Gift,
  LayoutDashboard,
  KeyRound,
  LogOut,
  Mail,
  Megaphone,
  Package,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Users,
  X,
} from "lucide-react";

const navigation = [
  { label: "Overview", path: "/admin", icon: LayoutDashboard, end: true },
  { label: "Orders", path: "/admin/orders", icon: ShoppingBag },
  { label: "Products", path: "/admin/products", icon: Package },
  { label: "Categories", path: "/admin/categories", icon: Boxes },
  { label: "Inventory", path: "/admin/inventory", icon: Activity, alert: true },
  { label: "Customers", path: "/admin/customers", icon: Users },
  { label: "Analytics", path: "/admin/analytics", icon: BarChart3 },
  { label: "Marketing", path: "/admin/marketing", icon: Megaphone },
  { label: "Coupons", path: "/admin/coupons", icon: Gift },
  { label: "Promotional products", path: "/admin/promotions", icon: Package },
  {
    label: "Abandoned carts",
    path: "/admin/abandoned-carts",
    icon: ShoppingCart,
  },
  { label: "Contact messages", path: "/admin/contact-messages", icon: Mail },
  { label: "Blog", path: "/admin/blogs", icon: BookOpen },
  { label: "Activity history", path: "/admin/activity", icon: Activity },
  { label: "Access control", path: "/admin/access", icon: KeyRound },
];

export default function AdminSidebar({
  open,
  onClose,
  collapsed,
  onToggle,
  user,
  onLogout,
}) {
  const initials = (user?.name || "Admin")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <>
      <button
        className={`admin-sidebar-scrim ${open ? "is-open" : ""}`}
        onClick={onClose}
        aria-label="Close navigation"
      />
      <aside
        className={`admin-sidebar ${open ? "is-open" : ""} ${collapsed ? "is-collapsed" : ""}`}
      >
        <div className="admin-store-switcher">
          <div className="admin-store-avatar">E</div>
          <div className="admin-store-copy">
            <strong>Perfume Store</strong>
            <span>Admin workspace</span>
          </div>
          <ChevronLeft className="admin-store-chevron" size={15} />
        </div>
        <div className="admin-nav-label">WORKSPACE</div>
        <nav className="admin-navigation" aria-label="Admin navigation">
          {navigation.map(({ label, path, icon: Icon, count, alert, end }) => (
            <NavLink
              key={path}
              end={end}
              to={path}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `admin-nav-link ${isActive ? "is-active" : ""}`
              }
              onClick={onClose}
            >
              <Icon size={18} />
              <span>{label}</span>
              {count && <small>{count}</small>}
              {alert && <i className="admin-nav-alert" />}
            </NavLink>
          ))}
        </nav>
        <div className="admin-nav-bottom">
          <div className="admin-nav-label">PREFERENCES</div>
          <NavLink
            to="/admin/settings"
            className={({ isActive }) =>
              `admin-nav-link ${isActive ? "is-active" : ""}`
            }
            title={collapsed ? "Settings" : undefined}
            onClick={onClose}
          >
            <Settings size={18} />
            <span>Settings</span>
          </NavLink>
          <button
            className="admin-nav-link"
            onClick={() => window.dispatchEvent(new CustomEvent("admin:help"))}
          >
            <CircleHelp size={18} />
            <span>Help & support</span>
          </button>
        </div>
        <div className="admin-sidebar-footer">
          <div className="admin-avatar admin-avatar-green">{initials}</div>
          <div className="admin-user-copy">
            <strong>{user?.name || "Administrator"}</strong>
            <span>{user?.primaryRole || user?.role || "Admin"}</span>
          </div>
          <button
            className="admin-collapse-button"
            onClick={onLogout}
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
          <button
            className="admin-collapse-button"
            onClick={onToggle}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronLeft size={17} />
          </button>
        </div>
      </aside>
    </>
  );
}
