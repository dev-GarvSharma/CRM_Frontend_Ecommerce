import { useEffect, useState } from "react";
import { Download, Eye, Plus, UserRoundPlus, X } from "lucide-react";
import {
  createCustomer,
  exportCustomers,
  getAllCustomers,
  getCustomerDetails,
  getCustomerOrders,
} from "./api.js";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  ListPagination,
  PageHeading,
  SearchField,
  StatusPill,
} from "../../components/AdminPrimitives.jsx";
import { formatRupees } from "../../models/catalog.js";
import AdminPortal from "../../components/AdminPortal.jsx";
import { downloadCsv } from "../../services/exportCsv.js";

const getCustomerOrdersCount = (order) => {
  if (Array.isArray(order.items)) {
    return order.items.reduce(
      (count, item) => count + Number(item?.quantity || 0),
      0,
    );
  }
  return Number(order.items || 0);
};

const formatCustomerDate = (date) => {
  if (!date) return "—";
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime())
    ? date
    : new Intl.DateTimeFormat("en", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      }).format(parsed);
};

export default function Customers({ globalSearch = "", onNotify }) {
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [customerOrdersMeta, setCustomerOrdersMeta] = useState(null);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersRecords, setOrdersRecords] = useState(10);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [page, setPage] = useState(1);
  const [records, setRecords] = useState(20);
  const load = () => {
    setLoading(true);
    setFailed(false);
    getAllCustomers(page, records)
      .then((result) => {
        if (result.success) setResponse(result);
        else setFailed(true);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    getAllCustomers(page, records)
      .then((result) => {
        if (result.success) setResponse(result);
        else setFailed(true);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [page, records]);
  if (loading) return <LoadingState label="Loading customer directory" />;
  if (failed) return <ErrorState retry={load} />;
  const customers = response?.data?.data || [];
  const getCustomerSegment = (customer) =>
    customer.segment ||
    (customer.status
      ? customer.status.charAt(0).toUpperCase() + customer.status.slice(1)
      : "Customer");
  const visible = customers.filter((customer) =>
    `${customer.name} ${customer.email} ${customer.location}`
      .toLowerCase()
      .includes((globalSearch.trim() || query).toLowerCase().trim()),
  );
  const openCustomer = async (customer) => {
    setSelectedCustomer(customer);
    setCustomerOrders([]);
    setCustomerOrdersMeta(null);
    setOrdersPage(1);
    setOrdersLoading(true);
    const [customerResult, ordersResult] = await Promise.all([
      getCustomerDetails(customer.id),
      getCustomerOrders(customer.id, 1, ordersRecords),
    ]);
    if (customerResult.success) {
      setSelectedCustomer({
        ...customer,
        ...customerResult?.data?.data,
      });
    }
    if (ordersResult.success) {
      setCustomerOrders(ordersResult?.data?.data || []);
      setCustomerOrdersMeta(ordersResult?.data?.meta || null);
    }
    setOrdersLoading(false);
  };
  const submitCustomer = async (event) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const customer = {
      name: String(values.get("name") || "").trim(),
      phone: String(values.get("phone") || "").trim(),
      email: String(values.get("email") || "").trim() || undefined,
    };
    setSavingCustomer(true);
    const result = await createCustomer(customer);
    setSavingCustomer(false);
    if (!result.success) {
      onNotify(result.message || "Could not create customer.");
      return;
    }
    await load();
    setAddCustomerOpen(false);
    onNotify("Account created. The customer must verify their mobile before signing in.");
  };
  return (
    <div className="admin-page-content">
      <PageHeading
        eyebrow="RELATIONSHIPS"
        title="Customers"
        description="Understand your community and make every order feel personal."
        action={
          <div className="admin-heading-actions">
            <button
              className="admin-button admin-button-secondary"
              onClick={async () => {
                const result = await exportCustomers();
                const rows = result.data?.data || [];
                onNotify(result.success
                  ? downloadCsv("store-customers.csv", rows) ? "Customers downloaded." : "No customers to export."
                  : result.message || "Could not export customers.");
              }}
            >
              <Download size={16} />
              Export
            </button>
            <button
              className="admin-button admin-button-dark"
              onClick={() => setAddCustomerOpen(true)}
            >
              <UserRoundPlus size={16} />
              Add customer
            </button>
          </div>
        }
      />
      <div className="admin-summary-strip">
        <div>
          <span>All customers</span>
          <strong>{response?.data?.meta?.totalRecords ?? customers.length}</strong>
        </div>
        <div>
          <span>New this month</span>
          <strong>{customers.filter((customer) => !customer.isVerified).length}</strong>
        </div>
        <div>
          <span>Verified accounts</span>
          <strong>{customers.filter((customer) => customer.isVerified).length}</strong>
        </div>
        <div>
          <span>Active accounts</span>
          <strong>{customers.filter((customer) => customer.status === "active").length}</strong>
        </div>
      </div>
      <section className="admin-panel admin-table-panel">
        <div className="admin-list-toolbar">
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Search name, email or location"
          />
          <span className="admin-muted-count">{visible.length} customers</span>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>CUSTOMER</th>
                <th>LOCATION</th>
                <th>ORDERS</th>
                <th>TOTAL SPENT</th>
                <th>JOINED</th>
                <th>SEGMENT</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((customer, index) => (
                <tr key={customer.id}>
                  <td>
                    <div className="admin-customer-cell">
                      <div
                        className={`admin-mini-avatar customer-color-${index % 4}`}
                      >
                        {customer.name
                          .split(" ")
                          .map((part) => part[0])
                          .join("")}
                      </div>
                      <div>
                        <strong>{customer.name}</strong>
                  <small>{customer.phone}{customer.email ? ` · ${customer.email}` : ""}</small>
                      </div>
                    </div>
                  </td>
                  <td>{customer.location}</td>
                  <td>{customer.totalOrders ?? customer.orders ?? 0} orders</td>
                  <td className="admin-table-total">
                    {formatRupees(
                      customer.lifetimeSpend ??
                        customer.totalSpent ??
                        customer.spent ??
                        0,
                    )}
                  </td>
                  <td>{customer.joined || formatCustomerDate(customer.createdAt)}</td>
                  <td>
                    <StatusPill>{getCustomerSegment(customer)}</StatusPill>
                  </td>
                  <td>
                    <button
                      className="admin-icon-button table-more"
                      aria-label={`View ${customer.name}`}
                      onClick={() => openCustomer(customer)}
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!visible.length && <EmptyState title="No customers found" />}
        </div>
        <ListPagination meta={response?.data?.meta} page={page} records={records} onPageChange={setPage} onRecordsChange={(size) => { setPage(1); setRecords(size); }} label="customers" />
      </section>
      {selectedCustomer && (
        <div
          className="admin-modal-backdrop"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setSelectedCustomer(null)
          }
        >
          <aside className="admin-drawer">
            <div className="admin-modal-header">
              <div>
                <span className="admin-eyebrow">CUSTOMER PROFILE</span>
                <h2>{selectedCustomer.name}</h2>
              </div>
              <button
                className="admin-icon-button"
                aria-label="Close customer details"
                onClick={() => setSelectedCustomer(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="admin-customer-profile">
              <div className="admin-customer-profile-avatar">
                {selectedCustomer.name
                  .split(" ")
                  .map((part) => part[0])
                  .join("")}
              </div>
              <div>
                <strong>{selectedCustomer.name}</strong>
                <StatusPill>{getCustomerSegment(selectedCustomer)}</StatusPill>
              </div>
            </div>
            <div className="admin-detail-section">
              <h3>Contact details</h3>
              <strong>{selectedCustomer.email}</strong>
              {selectedCustomer.phone && <span>{selectedCustomer.phone}</span>}
              <span>{selectedCustomer.location}</span>
              <span>
                Customer since {selectedCustomer.joined || formatCustomerDate(selectedCustomer.createdAt)}
              </span>
            </div>
            <div className="admin-customer-stat-grid">
              <div>
                <span>Total orders</span>
                <strong>
                  {selectedCustomer.totalOrders ??
                    selectedCustomer.orders ??
                    customerOrdersMeta?.totalRecords ??
                    customerOrders.length}
                </strong>
              </div>
              <div>
                <span>Lifetime spend</span>
                <strong>
                  {formatRupees(
                    selectedCustomer.lifetimeSpend ??
                      selectedCustomer.totalSpent ??
                      selectedCustomer.spent ??
                      0,
                  )}
                </strong>
              </div>
            </div>
            <div className="admin-customer-orders-heading">
              <h3>Recent orders</h3>
              <span>
                {ordersLoading
                  ? "Loading"
                  : `${customerOrders.length} orders`}
              </span>
            </div>
            {customerOrders.map((order) => (
              <div className="admin-customer-order" key={order.id}>
                <div>
                  <strong>{order.id}</strong>
                  <span>
                    {formatCustomerDate(order.date || order.createdAt)} · {getCustomerOrdersCount(order)} item
                    {getCustomerOrdersCount(order) !== 1 ? "s" : ""}
                  </span>
                </div>
                <div>
                  <strong>{formatRupees(order.total ?? order.totalAmount ?? 0)}</strong>
                  <StatusPill>{order.status}</StatusPill>
                </div>
              </div>
            ))}
            {!ordersLoading && customerOrders.length === 0 && (
              <div className="admin-customer-no-orders">
                No orders for this customer yet.
              </div>
            )}
            {ordersLoading && (
              <div className="admin-customer-no-orders">
                Loading order history...
              </div>
            )}
            <ListPagination
              meta={customerOrdersMeta}
              page={ordersPage}
              records={ordersRecords}
              onPageChange={async (nextPage) => {
                setOrdersPage(nextPage);
                setOrdersLoading(true);
                const result = await getCustomerOrders(selectedCustomer.id, nextPage, ordersRecords);
                if (result.success) {
                  setCustomerOrders(result?.data?.data || []);
                  setCustomerOrdersMeta(result?.data?.meta || null);
                }
                setOrdersLoading(false);
              }}
              onRecordsChange={async (size) => {
                setOrdersRecords(size);
                setOrdersPage(1);
                setOrdersLoading(true);
                const result = await getCustomerOrders(selectedCustomer.id, 1, size);
                if (result.success) {
                  setCustomerOrders(result?.data?.data || []);
                  setCustomerOrdersMeta(result?.data?.meta || null);
                }
                setOrdersLoading(false);
              }}
              label="orders"
            />
          </aside>
        </div>
      )}
      {addCustomerOpen && (
        <AdminPortal>
          <div
            className="admin-modal-backdrop"
            role="presentation"
            onMouseDown={(event) =>
              event.target === event.currentTarget && setAddCustomerOpen(false)
            }
          >
            <form className="admin-modal" onSubmit={submitCustomer}>
              <div className="admin-modal-header">
                <div>
                  <span className="admin-eyebrow">CUSTOMER DIRECTORY</span>
                  <h2>Add customer</h2>
                </div>
                <button
                  type="button"
                  className="admin-icon-button"
                  aria-label="Close"
                  onClick={() => setAddCustomerOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>
              <label>
                Customer name
                <input name="name" required placeholder="Full name" />
              </label>
              <label>
                Mobile number
                <input name="phone" type="tel" required pattern="[+][1-9][0-9]{7,14}" placeholder="+919876543210" />
              </label>
              <label>
                Email address (optional)
                <input name="email" type="email" placeholder="name@example.com" />
              </label>
              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-button admin-button-secondary"
                  onClick={() => setAddCustomerOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="admin-button admin-button-dark"
                  type="submit"
                  disabled={savingCustomer}
                >
                  <Plus size={16} />
                  {savingCustomer ? "Creating…" : "Create customer"}
                </button>
              </div>
            </form>
          </div>
        </AdminPortal>
      )}
    </div>
  );
}
