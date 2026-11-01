import { useEffect, useMemo, useState } from "react";
import { EmptyState, ErrorState, LoadingState, PageHeading } from "../components/AdminPrimitives.jsx";
import { getAbandonedCarts, sendCartRecovery } from "./operationsApi.js";

export default function AbandonedCarts({ globalSearch = "", onNotify }) {
  const [carts, setCarts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [sendingId, setSendingId] = useState(null);

  const load = async () => {
    setLoading(true);
    const result = await getAbandonedCarts();
    setFailed(!result.success);
    if (result.success) setCarts(result.data?.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  const recover = async (session) => {
    setSendingId(session.id);
    const result = await sendCartRecovery(session.id);
    onNotify?.(result.message || (result.success ? "Recovery email sent." : "Could not send recovery email."));
    if (result.success) await load();
    setSendingId(null);
  };
  const term = globalSearch.trim().toLowerCase();
  const visibleCarts = useMemo(() => carts.filter((session) => {
    const cart = session.Cart || session.cart || {};
    const customer = cart.user || {};
    return `${customer.name || ""} ${customer.email || ""} ${customer.phone || ""} ${session.abandonmentReason || ""} ${session.abandonmentComment || ""}`.toLowerCase().includes(term);
  }), [carts, term]);

  if (loading) return <LoadingState label="Loading abandoned carts" />;
  if (failed) return <ErrorState retry={load} />;

  return (
    <div className="admin-page-content">
      <PageHeading eyebrow="CUSTOMER ACTIVITY" title="Abandoned carts" description="Review carts inactive for 24 hours and send one recovery email to customers who are verified and opted in to marketing email." />
      <section className="admin-panel admin-table-panel">
        <div className="admin-panel-heading"><div><h2>Abandoned carts</h2><p>{visibleCarts.length} carts</p></div></div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>CUSTOMER</th><th>EMAIL</th><th>PHONE</th><th>ITEMS</th><th>REASON</th><th>COMMENT</th><th>ABANDONED</th><th>RECOVERY</th></tr></thead>
            <tbody>{visibleCarts.map((session) => {
              const cart = session.Cart || session.cart || {};
              const customer = cart.user || {};
              const canRecover = customer.email && customer.isVerified && customer.marketingEmailSubscribed;
              return <tr key={session.id}><td>{customer.name || "Guest customer"}</td><td>{customer.email || "—"}</td><td>{customer.phone || "—"}</td><td>{cart.items?.length || 0}</td><td>{session.abandonmentReason || "Automatic"}</td><td>{session.abandonmentComment || "—"}</td><td>{session.abandonedAt ? new Date(session.abandonedAt).toLocaleString() : "—"}</td><td>{session.recoverySentAt ? `Sent ${new Date(session.recoverySentAt).toLocaleString()}` : <button className="admin-button admin-button-dark" disabled={!canRecover || sendingId === session.id} title={!canRecover ? "Customer must have a verified email and an active marketing subscription." : "Send cart recovery email"} onClick={() => recover(session)}>{sendingId === session.id ? "Sending…" : canRecover ? "Send email" : "Not eligible"}</button>}</td></tr>;
            })}</tbody>
          </table>
          {!visibleCarts.length && <EmptyState title="No matching abandoned carts" />}
        </div>
      </section>
    </div>
  );
}
