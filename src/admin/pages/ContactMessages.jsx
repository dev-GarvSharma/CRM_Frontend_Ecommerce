import { useEffect, useMemo, useState } from "react";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeading,
} from "../components/AdminPrimitives.jsx";
import { getContactMessages, updateContactMessage } from "./contactMessagesApi.js";

const statuses = ["new", "in_progress", "resolved"];

export default function ContactMessages({ globalSearch = "", onNotify }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [savingId, setSavingId] = useState(null);

  const load = async () => {
    setLoading(true);
    const result = await getContactMessages();
    setFailed(!result.success);
    if (result.success) setMessages(result.data?.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  const term = globalSearch.trim().toLowerCase();
  const visibleMessages = useMemo(
    () => messages.filter((item) =>
      `${item.name} ${item.email} ${item.phone || ""} ${item.subject} ${item.message}`
        .toLowerCase()
        .includes(term),
    ),
    [messages, term],
  );

  const changeStatus = async (item, status) => {
    setSavingId(item.id);
    const result = await updateContactMessage(item.id, { status });
    if (result.success) {
      setMessages((current) => current.map((message) =>
        message.id === item.id ? { ...message, status } : message,
      ));
    }
    onNotify?.(result.message || (result.success ? "Message updated." : "Could not update message."));
    setSavingId(null);
  };

  if (loading) return <LoadingState label="Loading contact messages" />;
  if (failed) return <ErrorState retry={load} />;

  return (
    <div className="admin-page-content">
      <PageHeading
        eyebrow="CUSTOMER SUPPORT"
        title="Contact messages"
        description="Read customer queries submitted through the storefront contact form."
      />
      <section className="admin-panel admin-table-panel">
        <div className="admin-panel-heading">
          <div><h2>Customer queries</h2><p>{visibleMessages.length} messages</p></div>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>RECEIVED</th><th>CUSTOMER</th><th>ISSUE AND DETAILS</th><th>STATUS</th></tr></thead>
            <tbody>{visibleMessages.map((item) => (
              <tr key={item.id}>
                <td>{new Date(item.createdAt).toLocaleString()}</td>
                <td><strong>{item.name}</strong><br /><a href={`mailto:${item.email}`}>{item.email}</a>{item.phone && <><br />{item.phone}</>}</td>
                <td><strong>{item.subject}</strong><p className="mt-2 whitespace-pre-wrap">{item.message}</p></td>
                <td><select aria-label={`Status for ${item.subject}`} value={item.status} disabled={savingId === item.id} onChange={(event) => changeStatus(item, event.target.value)}>{statuses.map((status) => <option key={status} value={status}>{status.replace("_", " ")}</option>)}</select>{savingId === item.id && <small className="block mt-1">Saving…</small>}</td>
              </tr>
            ))}</tbody>
          </table>
          {!visibleMessages.length && <EmptyState title="No matching contact messages" />}
        </div>
      </section>
    </div>
  );
}
