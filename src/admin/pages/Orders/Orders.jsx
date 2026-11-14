import { useEffect, useState } from "react";
import {
  Download,
  Eye,
  MapPin,
  PackageCheck,
  Phone,
  Save,
  X,
} from "lucide-react";
import {
  exportOrders,
  getAllOrders,
  getOrderDetails,
  updateOrderStatus,
} from "./api.js";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  ListPagination,
  PageHeading,
  SearchField,
  SelectField,
  StatusPill,
} from "../../components/AdminPrimitives.jsx";
import { formatRupees } from "../../models/catalog.js";
import { downloadCsv } from "../../services/exportCsv.js";
import { resolveImageUrl } from "../../../utils/image.js";

export default function Orders({ globalSearch = "", onNotify }) {
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All orders");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detail, setDetail] = useState(null);
  const [statusDraft, setStatusDraft] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);
  const [orderUpdates, setOrderUpdates] = useState({});
  const [page, setPage] = useState(1);
  const [records, setRecords] = useState(10);
  const load = () => {
    setLoading(true);
    setFailed(false);
    getAllOrders(page, records)
      .then((result) => {
        if (result.success) setResponse(result);
        else setFailed(true);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    getAllOrders(page, records)
      .then((result) => {
        if (result.success) setResponse(result);
        else setFailed(true);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [page, records]);
  const orders = (response?.data?.data || []).map((order) => ({
    ...order,
    ...orderUpdates[order.id],
  }));
  const summary = response?.data?.meta?.summary || {};
  const visible = orders.filter(
    (order) =>
      `${order.id} ${order.customer} ${order.email}`
        .toLowerCase()
        .includes((globalSearch.trim() || query).toLowerCase().trim()) &&
      (filter === "All orders" || order.status === filter),
  );
  const openOrder = async (order) => {
    setSelectedOrder(order);
    setDetail(null);
    setStatusDraft(order.status);
    const result = await getOrderDetails(order.uuid || order.id);
    if (!result.success) {
      setSelectedOrder(null);
      onNotify(result.message || "Could not load order details.");
      return;
    }
    const orderDetail = result?.data?.data;
    setDetail({
      ...order,
      ...orderDetail,
      customer: order.customer || orderDetail.shippingAddress?.recipient || "—",
      email: order.email || "—",
      payment: orderDetail.paymentStatus || order.payment,
      method: orderDetail.paymentMethod || order.method,
      date: orderDetail.createdAt || order.date,
      items: Array.isArray(orderDetail.items) ? orderDetail.items : order.items,
      ...orderUpdates[order.id],
    });
    setStatusDraft(orderDetail.status || order.status);
  };
  const saveStatus = async () => {
    setSavingStatus(true);
    const result = await updateOrderStatus(
      detail?.id || selectedOrder.uuid || selectedOrder.id,
      statusDraft,
    );
    setSavingStatus(false);
    if (!result.success) {
      onNotify(result.message || "Could not update order status.");
      return;
    }
    const next = { status: statusDraft };
    setOrderUpdates((current) => ({
      ...current,
      [selectedOrder.id]: { ...current[selectedOrder.id], ...next },
    }));
    setDetail((current) => ({ ...current, ...next }));
    setSelectedOrder((current) => ({ ...current, ...next }));
    await load();
    onNotify(`${selectedOrder.id} status updated.`);
  };
  if (loading) return <LoadingState label="Loading orders" />;
  if (failed) return <ErrorState retry={load} />;
  return (
    <div className="admin-page-content">
      <PageHeading
        eyebrow="SALES"
        title="Orders"
        description="Track, fulfill and follow up on customer orders."
        action={
          <button
            className="admin-button admin-button-secondary"
            onClick={async () => {
              const result = await exportOrders();
              const rows = result.data?.data || [];
              onNotify(
                result.success
                  ? downloadCsv("store-orders.csv", rows)
                    ? "Orders downloaded."
                    : "No orders to export."
                  : result.message || "Could not export orders.",
              );
            }}
          >
            <Download size={16} />
            Export orders
          </button>
        }
      />
      <div className="admin-summary-strip">
        <div>
          <span>Total orders</span>
          <strong>
            {summary.totalOrders ??
              response?.data?.meta?.totalRecords ??
              orders.length}
          </strong>
        </div>
        <div>
          <span>To fulfill</span>
          <strong className="text-warn">
            {summary.toFulfill ??
              orders.filter(
                (item) =>
                  item.status === "Processing" || item.status === "Pending",
              ).length}
          </strong>
        </div>
        <div>
          <span>Shipped</span>
          <strong>
            {summary.shipped ??
              orders.filter((item) => item.status === "Shipped").length}
          </strong>
        </div>
        <div>
          <span>Revenue</span>
          <strong>
            {formatRupees(
              summary.revenue ??
                orders
                  .filter((item) => item.payment === "Paid")
                  .reduce((sum, item) => sum + Number(item.total || 0), 0),
            )}
          </strong>
        </div>
      </div>
      <section className="admin-panel admin-table-panel">
        <div className="admin-list-toolbar">
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Search order, customer or email"
          />
          <SelectField
            value={filter}
            onChange={setFilter}
            options={[
              "All orders",
              "Pending",
              "Processing",
              "Shipped",
              "Delivered",
              "Cancelled",
            ]}
            ariaLabel="Filter orders by status"
          />
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ORDER</th>
                <th>CUSTOMER</th>
                <th>DATE</th>
                <th>ITEMS</th>
                <th>PAYMENT</th>
                <th>TOTAL</th>
                <th>STATUS</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visible.map((order) => (
                <tr key={order.id} className="admin-click-row">
                  <td>
                    <strong>{order.id}</strong>
                  </td>
                  <td>
                    <div className="admin-customer-cell">
                      <div className="admin-mini-avatar">
                        {order.customer
                          .split(" ")
                          .map((word) => word[0])
                          .join("")}
                      </div>
                      <div>
                        <span>{order.customer}</span>
                        <small>{order.email}</small>
                      </div>
                    </div>
                  </td>
                  <td>{order.date}</td>
                  <td>{order.items} items</td>
                  <td>
                    <StatusPill>{order.payment}</StatusPill>
                  </td>
                  <td className="admin-table-total">
                    {formatRupees(order.total)}
                  </td>
                  <td>
                    <StatusPill>{order.status}</StatusPill>
                  </td>
                  <td>
                    <button
                      className="admin-icon-button table-more"
                      aria-label={`View ${order.id}`}
                      onClick={() => openOrder(order)}
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!visible.length && <EmptyState title="No matching orders" />}
        </div>
        <ListPagination
          meta={response?.data?.meta}
          page={page}
          records={records}
          onPageChange={setPage}
          onRecordsChange={(size) => {
            setPage(1);
            setRecords(size);
          }}
          label="orders"
        />
      </section>
      {selectedOrder && (
        <div
          className="admin-modal-backdrop"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setSelectedOrder(null)
          }
        >
          <aside className="admin-drawer">
            <div className="admin-modal-header">
              <div>
                <span className="admin-eyebrow">ORDER DETAILS</span>
                <h2>{selectedOrder.id}</h2>
              </div>
              <button
                className="admin-icon-button"
                aria-label="Close"
                onClick={() => setSelectedOrder(null)}
              >
                <X size={18} />
              </button>
            </div>
            {detail ? (
              <>
                <div className="admin-order-detail-status">
                  <PackageCheck size={19} />
                  <div>
                    <strong>{detail.status}</strong>
                    <span>
                      Placed {formatDate(detail.createdAt || detail.date)}
                    </span>
                  </div>
                </div>
                <section
                  className="admin-detail-section"
                  aria-labelledby="order-info-heading"
                >
                  <h3 id="order-info-heading">Order</h3>
                  <OrderField
                    label="Order number"
                    value={detail.orderNumber || detail.id}
                  />
                  <OrderField
                    label="Placed"
                    value={formatDate(detail.createdAt || detail.date)}
                  />
                </section>
                <section
                  className="admin-detail-section"
                  aria-labelledby="shipping-heading"
                >
                  <h3 id="shipping-heading">Deliver to</h3>
                  <div className="admin-order-delivery-card">
                    <div className="admin-order-delivery-recipient">
                      <span className="admin-order-delivery-avatar">
                        {(
                          detail.shippingAddress?.recipient ||
                          detail.customer ||
                          "G"
                        )
                          .trim()
                          .split(/\s+/)
                          .map((part) => part[0] || "")
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </span>
                      <div className="admin-order-delivery-contact">
                        <strong>
                          {detail.shippingAddress?.recipient ||
                            detail.customer ||
                            "Guest customer"}
                        </strong>
                        {detail.email && <span>{detail.email}</span>}
                      </div>
                    </div>
                    <address className="admin-order-address">
                      <MapPin size={15} aria-hidden="true" />
                      <div>
                        <span>
                          {detail.shippingAddress?.line1 ||
                            "Address unavailable"}
                        </span>
                        <span>
                          {[
                            detail.shippingAddress?.city,
                            detail.shippingAddress?.state,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </span>
                        <span>
                          {[
                            detail.shippingAddress?.postalCode,
                            detail.shippingAddress?.country,
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        </span>
                      </div>
                    </address>
                    {detail.shippingAddress?.phone && (
                      <a
                        className="admin-order-delivery-phone"
                        href={`tel:${detail.shippingAddress.phone}`}
                      >
                        <Phone size={13} aria-hidden="true" />
                        {detail.shippingAddress.phone}
                      </a>
                    )}
                  </div>
                </section>
                <section
                  className="admin-detail-section"
                  aria-labelledby="items-heading"
                >
                  <h3 id="items-heading">
                    Items (
                    {Array.isArray(detail.items)
                      ? detail.items.length
                      : detail.items || 0}
                    )
                  </h3>
                  {Array.isArray(detail.items) && detail.items.length > 0 ? (
                    <ul className="admin-order-items">
                      {detail.items.map((item) => (
                        <li className="admin-order-item" key={item.id}>
                          <div className="admin-order-item-image">
                            {(item.productSnapshot?.image ||
                              item.product?.images?.[0]?.path ||
                              item.variant?.images?.[0]) && (
                              <img
                                src={resolveImageUrl(
                                  item.productSnapshot?.image ||
                                    item.product?.images?.[0]?.path ||
                                    item.variant?.images?.[0],
                                )}
                                alt={item.name}
                              />
                            )}
                          </div>
                          <div className="admin-order-item-info">
                            <strong>{item.name}</strong>
                            <span>
                              {item.sku || "SKU unavailable"} · Qty{" "}
                              {item.quantity}
                            </span>
                          </div>
                          <div className="admin-order-item-price">
                            <span>
                              {formatMoney(item.unitPrice, detail.currency)}{" "}
                              each
                            </span>
                            <strong>
                              {formatMoney(
                                Number(item.unitPrice) * Number(item.quantity),
                                detail.currency,
                              )}
                            </strong>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="admin-order-empty-items">
                      Item details unavailable.
                    </p>
                  )}
                </section>
                <section
                  className="admin-detail-section"
                  aria-labelledby="payment-heading"
                >
                  <h3 id="payment-heading">Payment</h3>
                  <OrderField
                    label="Status"
                    value={detail.paymentStatus || detail.payment}
                  />
                  <OrderField
                    label="Method"
                    value={detail.paymentMethod || detail.method}
                  />
                  {detail.couponCode && (
                    <OrderField label="Coupon" value={detail.couponCode} />
                  )}
                </section>
                <section
                  className="admin-detail-section"
                  aria-labelledby="summary-heading"
                >
                  <h3 id="summary-heading">Payment summary</h3>
                  <OrderField
                    label="Subtotal"
                    value={formatMoney(detail.subtotal, detail.currency)}
                  />
                  {Number(detail.discount) > 0 && (
                    <OrderField
                      label="Discount"
                      value={`−${formatMoney(detail.discount, detail.currency)}`}
                    />
                  )}
                  <OrderField
                    label="Shipping"
                    value={formatMoney(detail.shipping, detail.currency)}
                  />
                  <OrderField
                    label="Total"
                    value={formatMoney(detail.total, detail.currency)}
                  />
                </section>
                <section
                  className="admin-detail-section"
                  aria-labelledby="fulfillment-heading"
                >
                  <h3 id="fulfillment-heading">Fulfillment status</h3>
                  <SelectField
                    value={statusDraft}
                    onChange={setStatusDraft}
                    options={[
                      "Pending",
                      "Processing",
                      "Shipped",
                      "Delivered",
                      "Cancelled",
                    ]}
                    ariaLabel="Update order status"
                  />
                </section>
                <button
                  className="admin-button admin-button-dark admin-full-button"
                  disabled={savingStatus}
                  onClick={saveStatus}
                >
                  <Save size={15} />
                  {savingStatus ? "Saving…" : "Save status"}
                </button>
              </>
            ) : (
              <LoadingState label="Loading order details" />
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

function OrderField({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1 text-[11px]">
      <span className="text-slate-500">{label}</span>
      <strong className="text-right text-slate-700">{value || "—"}</strong>
    </div>
  );
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function formatMoney(value, currency = "INR") {
  if (value === null || value === undefined || value === "") return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
  }).format(Number(value) || 0);
}
