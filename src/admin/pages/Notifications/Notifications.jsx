import { useEffect, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeading,
} from "../../components/AdminPrimitives.jsx";
import {
  getAllNotifications,
  markAllNotificationsRead,
} from "./api.js";

export default function Notifications({ globalSearch = "", onNotify }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [savingReadState, setSavingReadState] = useState(false);
  const load = async () => {
    setLoading(true);
    const result = await getAllNotifications();
    setFailed(!result.success);
    if (result.success) setNotifications(result.data?.data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  const markRead = async () => {
    setSavingReadState(true);
    const result = await markAllNotificationsRead(notifications.filter((item) => !item.read).map((item) => item.id));
    setSavingReadState(false);
    if (!result.success) return onNotify(result.message || "Could not mark notifications as read.");
    setNotifications((items) => items.map((item) => ({ ...item, read: true })));
    onNotify("Notifications marked as read.");
  };
  if (loading) return <LoadingState label="Loading notifications" />;
  if (failed) return <ErrorState retry={load} />;
  const term = globalSearch.trim().toLowerCase();
  const visible = notifications.filter((item) => `${item.title || ""} ${item.detail || ""} ${item.type || ""} ${JSON.stringify(item.payload || "")}`.toLowerCase().includes(term));
  const unread = notifications.filter((item) => !item.read).length;
  return <div className="admin-page-content">
    <PageHeading eyebrow="STORE UPDATES" title="Notifications" description={`${notifications.length} notifications · ${unread} unread`} action={<button className="admin-button admin-button-secondary" onClick={markRead} disabled={!unread || savingReadState}><CheckCheck size={16} /> {savingReadState ? "Saving…" : "Mark all as read"}</button>} />
    <div className="admin-notifications-page-list">
      {visible.map((item) => <article className={`admin-notification-card ${item.read ? "is-read" : "is-unread"}`} key={item.id}>
        <span className={`notification-mark notification-${item.type || "info"}`}><Bell size={16} /></span>
        <div className="admin-notification-card-content">
          <div className="admin-notification-card-heading"><div><span className="admin-eyebrow">{item.type || "UPDATE"}</span><h2>{item.title}</h2></div><div className="admin-notification-card-meta"><time>{item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}</time><span>{item.read ? "Read" : "Unread"}</span></div></div>
          <p>{item.detail || "No additional message was provided."}</p>
          {item.payload && <details><summary>View notification data</summary><pre>{JSON.stringify(item.payload, null, 2)}</pre></details>}
        </div>
      </article>)}
      {!visible.length && <EmptyState title={notifications.length ? "No matching notifications" : "No notifications yet"} detail="New store activity and account updates will appear here." />}
    </div>
  </div>;
}
