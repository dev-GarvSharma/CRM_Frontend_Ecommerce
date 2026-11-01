import { Bell, CheckCheck, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SearchField } from "./AdminPrimitives.jsx";
import {
  getAllNotifications,
  markAllNotificationsRead,
} from "../pages/Notifications/api.js";

const names = {
  "/admin": "Overview",
  "/admin/orders": "Orders",
  "/admin/products": "Products",
  "/admin/categories": "Categories",
  "/admin/inventory": "Inventory",
  "/admin/customers": "Customers",
  "/admin/analytics": "Analytics",
  "/admin/marketing": "Marketing",
  "/admin/access": "Access control",
  "/admin/coupons": "Coupons",
  "/admin/offers": "Coupons",
  "/admin/promotions": "Promotional products",
  "/admin/activity": "Activity history",
  "/admin/abandoned-carts": "Abandoned carts",
  "/admin/contact-messages": "Contact messages",
  "/admin/blogs": "Blog",
  "/admin/notifications": "Notifications",
  "/admin/settings": "Settings",
};

const searchDestinations = [
  { label: "Overview", keywords: "dashboard home", path: "/admin" },
  { label: "Orders", keywords: "sales payments fulfillment", path: "/admin/orders" },
  { label: "Products", keywords: "catalog perfume variants", path: "/admin/products" },
  { label: "Categories", keywords: "collections catalog", path: "/admin/categories" },
  { label: "Inventory", keywords: "stock variants", path: "/admin/inventory" },
  { label: "Customers", keywords: "users accounts", path: "/admin/customers" },
  { label: "Analytics", keywords: "reports sales", path: "/admin/analytics" },
  { label: "Marketing", keywords: "campaign subscribers", path: "/admin/marketing" },
  { label: "Coupons", keywords: "discount promo code", path: "/admin/coupons" },
  { label: "Promotional products", keywords: "free product gift promotion", path: "/admin/promotions" },
  { label: "Activity history", keywords: "audit admin changes", path: "/admin/activity" },
  { label: "Abandoned carts", keywords: "abandoned cart inactive checkout", path: "/admin/abandoned-carts" },
  { label: "Contact messages", keywords: "support contact questions queries", path: "/admin/contact-messages" },
  { label: "Blog", keywords: "posts articles writing editor seo", path: "/admin/blogs" },
  { label: "Access control", keywords: "roles permissions users", path: "/admin/access" },
  { label: "General store settings", keywords: "store name contact online store", path: "/admin/settings?section=general" },
  { label: "Notification settings", keywords: "email alerts low stock", path: "/admin/settings?section=notifications" },
  { label: "Checkout settings", keywords: "guest checkout phone prepaid cod payment", path: "/admin/settings?section=checkout" },
  { label: "Regional settings", keywords: "currency timezone language", path: "/admin/settings?section=regional" },
  { label: "Security settings", keywords: "account security login", path: "/admin/settings?section=security" },
  { label: "Admin notifications", keywords: "updates alerts", path: "/admin/notifications" },
];

export default function AdminTopbar({ onMenu, onSearch, search, menuOpen, user }) {
  const location = useLocation();
  const navigate = useNavigate();
  const section = names[location.pathname] || "Overview";
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const unread = notifications.filter((item) => !item.read).length;
  const searchMatches = search.trim()
    ? searchDestinations.filter((item) => `${item.label} ${item.keywords}`.toLowerCase().includes(search.trim().toLowerCase())).slice(0, 6)
    : [];
  const initials = (user?.name || "Admin")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  useEffect(() => {
    getAllNotifications()
      .then((response) => {
        if (response.success) setNotifications(response?.data?.data || []);
      })
      .catch(() => setNotifications([]));
  }, []);
  const markNotificationsRead = async () => {
    const result = await markAllNotificationsRead(
      notifications.map((item) => item.id),
    );
    if (result.success)
      setNotifications((items) =>
        items.map((item) => ({ ...item, read: true })),
      );
  };
  return (
    <header className="admin-topbar">
      <div className="admin-topbar-left">
        <button
          className="admin-icon-button admin-menu-button"
          onClick={onMenu}
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={menuOpen}
        >
          <Menu size={19} />
        </button>
        <div className="admin-breadcrumb">
          <span>Store</span>
          <b>/</b>
          <strong>{section}</strong>
        </div>
      </div>
      <div className="admin-topbar-tools">
        <div className="admin-global-search-wrap">
          <SearchField value={search} onChange={onSearch} onFocus={() => setSearchOpen(true)} onBlur={() => window.setTimeout(() => setSearchOpen(false), 100)} onKeyDown={(event) => { if (event.key === "Escape") setSearchOpen(false); if (event.key === "Enter" && searchMatches[0]) { navigate(searchMatches[0].path); onSearch(""); setSearchOpen(false); } }} placeholder="Search menus, settings, records..." />
          {searchOpen && searchMatches.length > 0 && <div className="admin-global-search-results" role="listbox" aria-label="Admin search results">
            {searchMatches.map((item) => <button key={`${item.label}:${item.path}`} type="button" role="option" onMouseDown={(event) => event.preventDefault()} onClick={() => { navigate(item.path); onSearch(""); setSearchOpen(false); }}><strong>{item.label}</strong><small>{item.path.includes("settings") ? "Setting" : "Admin menu"}</small></button>)}
          </div>}
        </div>
        <div className="admin-notification-wrap">
          <button
            className="admin-icon-button admin-notification-button"
            onClick={() => setNotificationsOpen((value) => !value)}
            aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
            aria-expanded={notificationsOpen}
          >
            <Bell size={18} />
            {unread > 0 && <i />}
          </button>
          {notificationsOpen && (
            <>
              <button
                className="admin-popover-dismiss"
                aria-label="Close notifications"
                onClick={() => setNotificationsOpen(false)}
              />
              <section
                className="admin-notification-popover"
                aria-label="Notifications"
              >
                <div className="admin-notification-header">
                  <div>
                    <strong>Notifications</strong>
                    <span>{unread ? `${unread} unread` : "All caught up"}</span>
                  </div>
                  <div>
                    <button
                      className="admin-icon-button"
                      title="Mark all as read"
                      aria-label="Mark all as read"
                      onClick={markNotificationsRead}
                    >
                      <CheckCheck size={16} />
                    </button>
                    <button
                      className="admin-icon-button"
                      title="Close notifications"
                      aria-label="Close notifications"
                      onClick={() => setNotificationsOpen(false)}
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
                <div className="admin-notification-list">
                  {notifications.slice(0, 3).map((item) => (
                    <article
                      className={`admin-notification-item ${item.read ? "is-read" : ""}`}
                      key={item.id}
                    >
                      <span
                        className={`notification-mark notification-${item.type || "info"}`}
                      >
                        <Bell size={14} />
                      </span>
                      <div>
                        <strong>{item.title}</strong>
                        <p>{item.detail}</p>
                        <small>{item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}</small>
                      </div>
                      {!item.read && <i className="notification-unread-dot" />}
                    </article>
                  ))}
                </div>
                <div className="admin-notification-footer">
                  <button onClick={markNotificationsRead}>Mark all as read</button>
                  <button onClick={() => { setNotificationsOpen(false); navigate("/admin/notifications"); }}>View all notifications</button>
                </div>
              </section>
            </>
          )}
        </div>
        <div className="admin-topbar-divider" />
        <button
          className="admin-help-button"
          onClick={() => window.dispatchEvent(new CustomEvent("admin:help"))}
        >
          <span>⌘ K</span>
        </button>
        <div className="admin-avatar admin-avatar-green" title={user?.name || "Administrator"}>{initials}</div>
      </div>
    </header>
  );
}
