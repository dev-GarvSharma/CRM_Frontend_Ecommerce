import { useEffect, useMemo, useState } from "react";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeading,
} from "../components/AdminPrimitives.jsx";
import { getAuditHistory } from "./operationsApi.js";

export default function Activity({ globalSearch = "" }) {
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = async () => {
    setLoading(true);
    const history = await getAuditHistory();
    setFailed(!history.success);
    if (history.success) setAudit(history.data?.data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const term = globalSearch.trim().toLowerCase();
  const visibleAudit = useMemo(
    () =>
      audit.filter((entry) =>
        `${entry.actor?.name || ""} ${entry.actorUserId || ""} ${entry.action || ""} ${entry.resourceType || ""} ${entry.resourceId || ""}`
          .toLowerCase()
          .includes(term),
      ),
    [audit, term],
  );

  if (loading) return <LoadingState label="Loading activity history" />;
  if (failed) return <ErrorState retry={load} />;

  return (
    <div className="admin-page-content">
      <PageHeading
        eyebrow="ADMIN HISTORY"
        title="Activity history"
        description="Review administrative changes made in the store."
      />
      <section className="admin-panel admin-table-panel">
        <div className="admin-panel-heading">
          <div>
            <h2>Administrative history</h2>
            <p>{visibleAudit.length} recorded changes</p>
          </div>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>TIME</th>
                <th>ACTOR</th>
                <th>ACTION</th>
                <th>RESOURCE</th>
                <th>CHANGES</th>
              </tr>
            </thead>
            <tbody>
              {visibleAudit.map((entry) => (
                <tr key={entry.id}>
                  <td>{new Date(entry.createdAt).toLocaleString()}</td>
                  <td>{entry.actor?.name || entry.actorUserId || "System"}</td>
                  <td>{entry.action}</td>
                  <td>
                    {entry.resourceType} {entry.resourceId || ""}
                  </td>
                  <td>
                    <code>{JSON.stringify(entry.changes || {})}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!visibleAudit.length && <EmptyState title="No matching activity" />}
        </div>
      </section>
    </div>
  );
}
