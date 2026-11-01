import { useEffect, useState } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Download,
  Ellipsis,
  Package,
  ShoppingBag,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import { getDashboardOverview } from "./api.js";
import LocalStorageService from "../../services/localStorageService.js";
import { downloadCsv } from "../../services/exportCsv.js";
import { resolveImageUrl } from "../../../utils/image.js";
import {
  PageHeading,
  LoadingState,
  ErrorState,
  StatusPill,
} from "../../components/AdminPrimitives.jsx";
import {
  formatRupees,
} from "../../models/catalog.js";

const getCustomerName = (order) =>
  typeof order.customer === "string"
    ? order.customer
    : order.customer?.name || order.customerName || order.email || "Guest customer";

const getChartPoints = (values = [], maxValue = 0) => {
  if (!values.length) return "";
  const max = maxValue || Math.max(...values.map((value) => Number(value) || 0), 1);
  return values
    .map((value, index) => {
      const x = values.length === 1 ? 350 : (index / (values.length - 1)) * 700;
      const y = 210 - ((Number(value) || 0) / max) * 180;
      return `${x},${y}`;
    })
    .join(" ");
};

export default function Dashboard({ globalSearch = "", onNotify }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const user = LocalStorageService.getUserData();
  const load = () => {
    setLoading(true);
    setFailed(false);
    getDashboardOverview()
      .then((response) => {
        if (response.success) setResult(response);
        else setFailed(true);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    getDashboardOverview()
      .then((response) => {
        if (response.success) setResult(response);
        else setFailed(true);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState label="Gathering your store overview" />;
  if (failed) return <ErrorState retry={load} />;
  const dashboard = result?.data?.data || {};
  const sales = dashboard.sales || {};
  const cards = dashboard.cards || {};
  const fulfillment = dashboard.fulfillment || {};
  const storeInsights = dashboard.storeInsights || {};
  const thisWeek = Array.isArray(dashboard.salesOverview?.thisWeek)
    ? dashboard.salesOverview.thisWeek
    : [];
  const lastWeek = Array.isArray(dashboard.salesOverview?.lastWeek)
    ? dashboard.salesOverview.lastWeek
    : [];
  const products = Array.isArray(dashboard.topProducts)
    ? dashboard.topProducts
    : Array.isArray(dashboard.products)
      ? dashboard.products
      : [];
  const latestOrders = (Array.isArray(dashboard.recentOrders)
    ? dashboard.recentOrders
    : Array.isArray(dashboard.orders)
      ? dashboard.orders
    : []
  )
    .map((order) => ({ ...order, customer: getCustomerName(order) }))
    .filter((order) =>
      `${order.id} ${order.customer}`
        .toLowerCase()
        .includes(globalSearch.trim().toLowerCase()),
    );
  const metrics = [
    { label: "Gross sales", value: formatRupees(cards.grossSales?.value ?? sales.total ?? 0), change: Number(cards.grossSales?.changePercent ?? sales.changePercent ?? 0), icon: Wallet, tone: "coral", data: "0,18 12,16 24,22 36,12 48,15 60,6 72,12 84,2 96,8" },
    { label: "Orders", value: cards.orders?.value ?? dashboard.metrics?.orders ?? 0, change: Number(cards.orders?.changePercent ?? dashboard.metrics?.weeklyOrders?.changePercent ?? 0), icon: ShoppingBag, tone: "blue", data: "0,17 12,21 24,14 36,18 48,8 60,13 72,5 84,9 96,1" },
    { label: "Customers", value: cards.customers?.value ?? dashboard.metrics?.customers ?? 0, change: Number(cards.customers?.changePercent ?? dashboard.metrics?.newCustomers?.changePercent ?? 0), icon: Users, tone: "green", data: "0,19 12,14 24,17 36,9 48,13 60,6 72,10 84,3 96,1" },
    { label: "Products sold", value: cards.productsSold?.value ?? dashboard.metrics?.productsSold?.value ?? 0, change: Number(cards.productsSold?.changePercent ?? dashboard.metrics?.productsSold?.changePercent ?? 0), icon: Package, tone: "yellow", data: "0,5 12,8 24,4 36,11 48,8 60,16 72,12 84,20 96,17" },
  ];
  const chartMax = Math.max(
    ...thisWeek.map((day) => Number(day.revenue) || 0),
    ...lastWeek.map((day) => Number(day.revenue) || 0),
    1,
  );
  const salesPath = getChartPoints(thisWeek.map((day) => day.revenue), chartMax);
  const lastWeekPath = getChartPoints(lastWeek.map((day) => day.revenue), chartMax);
  const salesAreaPath = salesPath ? `M${salesPath.replaceAll(" ", " L")} L700 230 L0 230Z` : "";
  const restockProducts = Array.isArray(storeInsights.restocking?.products)
    ? storeInsights.restocking.products
    : [];
  const exportReport = async () => {
    const response = await getDashboardOverview();
    const data = response.data?.data;
    if (!response.success || !data) {
      onNotify(response.message || "Could not export dashboard report.");
      return;
    }
    const rows = Object.entries(data.metrics || {}).map(([metric, value]) => ({
      metric,
      value: value?.value ?? value,
      changePercent: value?.changePercent ?? "",
    }));
    onNotify(downloadCsv("store-dashboard.csv", rows) ? "Dashboard report downloaded." : "No dashboard metrics to export.");
  };
  return (
    <div className="admin-page-content">
      <PageHeading
        eyebrow={new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "2-digit", year: "numeric" }).format(new Date()).toUpperCase()}
        title={`Welcome${user?.name ? `, ${user.name.split(" ")[0]}` : " to your store"}`}
        description="Here’s what’s happening with your store today."
        action={
          <div className="admin-heading-actions">
            <button className="admin-button admin-button-secondary">
              <CalendarDays size={16} />
              Last 7 days
            </button>
            <button
              className="admin-button admin-button-dark"
              onClick={exportReport}
            >
              <Download size={16} />
              Export report
            </button>
          </div>
        }
      />
      <div className="admin-metrics-grid">
        {metrics.map(({ label, value, change, icon: Icon, tone, data }) => (
          <article className="admin-metric-card" key={label}>
            <div className="admin-metric-top">
              <span>{label}</span>
              <span className={`admin-metric-icon metric-${tone}`}>
                <Icon size={17} />
              </span>
            </div>
            <div className="admin-metric-bottom">
              <strong>{value}</strong>
              <svg
                className={`admin-sparkline spark-${tone}`}
                viewBox="0 0 96 25"
                preserveAspectRatio="none"
              >
                <polyline points={data} />
              </svg>
            </div>
            <div className="admin-metric-foot">
              <span
                className={change < 0 ? "change-down" : "change-up"}
              >
                {change < 0 ? (
                  <ArrowDownRight size={13} />
                ) : (
                  <ArrowUpRight size={13} />
                )}
                {change > 0 ? "+" : ""}{change}%
              </span>
              <span>vs last week</span>
            </div>
          </article>
        ))}
      </div>
      <section className="admin-dashboard-grid">
        <article className="admin-panel admin-sales-panel">
          <div className="admin-panel-heading">
            <div>
              <h2>Sales overview</h2>
              <p>Revenue performance over time</p>
            </div>
            <button
              className="admin-icon-button"
              aria-label="More sales options"
            >
              <Ellipsis size={19} />
            </button>
          </div>
          <div className="admin-chart-legend">
            <span>
              <i className="legend-current" />
              This week <strong>{formatRupees(sales.thisWeek ?? 0)}</strong>
            </span>
            <span>
              <i className="legend-previous" />
              Last week <strong>{formatRupees(sales.lastWeek ?? 0)}</strong>
            </span>
            <span className="admin-chart-period">Last 7 days</span>
          </div>
          <div className="admin-chart">
            <div className="admin-chart-axis">
              {[1, 0.75, 0.5, 0.25, 0].map((fraction) => (
                <span key={fraction}>{formatRupees(chartMax * fraction)}</span>
              ))}
            </div>
            <div className="admin-chart-plot">
              <div className="admin-chart-gridlines">
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>
              <svg
                viewBox="0 0 700 230"
                preserveAspectRatio="none"
                aria-label="Weekly sales chart"
              >
                <defs>
                  <linearGradient id="sales-fill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#de785d" stopOpacity=".19" />
                    <stop offset="100%" stopColor="#de785d" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d={salesAreaPath}
                  fill="url(#sales-fill)"
                />
                <path
                  d={salesPath ? `M${salesPath.replaceAll(" ", " L")}` : ""}
                  fill="none"
                  stroke="#d8775d"
                  strokeWidth="3"
                  vectorEffect="non-scaling-stroke"
                />
                <path
                  d={lastWeekPath ? `M${lastWeekPath.replaceAll(" ", " L")}` : ""}
                  fill="none"
                  stroke="#9abcb1"
                  strokeWidth="2"
                  strokeDasharray="5 6"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              <div className="admin-chart-days">
                {thisWeek.map((day) => <span key={day.date}>{day.day}</span>)}
              </div>
            </div>
          </div>
        </article>
        <article className="admin-panel admin-insight-panel">
          <div className="admin-panel-heading">
            <div>
              <h2>Store insights</h2>
              <p>Quick signals to keep an eye on</p>
            </div>
            <Sparkles size={18} className="admin-insight-spark" />
          </div>
          <div className="admin-insight-list">
            <div className="admin-insight-item">
              <div className="insight-number">01</div>
              <div>
                <strong>Repeat purchases</strong>
                <p>{storeInsights.repeatPurchases?.message || "Repeat purchase data is unavailable."}</p>
              </div>
              <ArrowUpRight size={16} />
            </div>
            <div className="admin-insight-item">
              <div className="insight-number insight-warn">02</div>
              <div>
                <strong>{storeInsights.restocking?.count ?? 0} {storeInsights.restocking?.count === 1 ? "product needs" : "products need"} restocking</strong>
                <p>{restockProducts.map((product) => product.name).join(", ") || "All products are above the restock threshold."}</p>
              </div>
              <ArrowRight size={16} />
            </div>
            <div className="admin-insight-item">
              <div className="insight-number insight-blue">03</div>
              <div>
                <strong>{storeInsights.cartConversion?.available ? "Cart conversion" : "Cart conversion unavailable"}</strong>
                <p>{storeInsights.cartConversion?.message || "Checkout funnel events are not currently tracked."}</p>
              </div>
              <ArrowUpRight size={16} />
            </div>
          </div>
          <button
            className="admin-text-button"
            onClick={() => window.location.assign("/admin/analytics")}
          >
            Explore analytics <ArrowRight size={15} />
          </button>
        </article>
      </section>
      <section className="admin-panel admin-table-panel">
        <div className="admin-panel-heading">
          <div>
            <h2>Recent orders</h2>
            <p>A quick look at the latest activity</p>
          </div>
          <button
            className="admin-text-button"
            onClick={() => window.location.assign("/admin/orders")}
          >
            View all orders <ArrowRight size={15} />
          </button>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ORDER</th>
                <th>CUSTOMER</th>
                <th>DATE</th>
                <th>ITEMS</th>
                <th>TOTAL</th>
                <th>STATUS</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {latestOrders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <strong>{order.id}</strong>
                  </td>
                  <td>
                    <div className="admin-customer-cell">
                      <div className="admin-mini-avatar">
                        {order.customer
                          .trim()
                          .split(" ")
                          .map((word) => word[0] || "")
                          .join("")}
                      </div>
                      <span>{order.customer}</span>
                    </div>
                  </td>
                  <td>{order.date}</td>
                  <td>{order.items} items</td>
                  <td className="admin-table-total">
                    {formatRupees(order.total)}
                  </td>
                  <td>
                    <StatusPill>{order.status}</StatusPill>
                  </td>
                  <td>
                    <button
                      className="admin-icon-button table-more"
                      aria-label={`More actions for ${order.id}`}
                    >
                      <Ellipsis size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!latestOrders.length && (
            <div className="admin-inline-empty">No matching orders found.</div>
          )}
        </div>
      </section>
      <section className="admin-bottom-grid">
        <article className="admin-panel admin-products-panel">
          <div className="admin-panel-heading">
            <div>
              <h2>Top products</h2>
              <p>Your best performers this week</p>
            </div>
            <button
              className="admin-text-button"
              onClick={() => window.location.assign("/admin/products")}
            >
              All products <ArrowRight size={15} />
            </button>
          </div>
          {products.slice(0, 4).map((item, index) => (
            <div className="admin-top-product" key={item.productId || item.id || item.sku}>
              <div className="admin-product-thumb">
                {item.image && <img src={resolveImageUrl(item.image)} alt={item.name || ""} />}
              </div>
              <div className="admin-top-product-info">
                <strong>{item.name}</strong>
                <span>
                  {item.quantity ?? item.stock ?? 0} units sold · {item.sku}
                </span>
              </div>
              <span className="admin-product-rank">0{index + 1}</span>
              <strong>{formatRupees(item.revenue ?? item.price ?? 0)}</strong>
            </div>
          ))}
        </article>
        <article className="admin-panel admin-fulfillment-panel">
          <div className="admin-panel-heading">
            <div>
              <h2>Fulfillment</h2>
              <p>Orders that need attention</p>
            </div>
            <span className="admin-count-badge">{fulfillment.unfulfilledOrders ?? 0}</span>
          </div>
          <div className="admin-fulfillment-stat">
            <div>
              <span>Unfulfilled orders</span>
              <strong>{fulfillment.unfulfilledOrders ?? 0} orders</strong>
            </div>
            <span className="fulfillment-bar">
              <i style={{ width: `${(fulfillment.unfulfilledOrders || 0) + (fulfillment.readyToShip || 0) ? ((fulfillment.unfulfilledOrders || 0) / ((fulfillment.unfulfilledOrders || 0) + (fulfillment.readyToShip || 0))) * 100 : 0}%` }} />
            </span>
          </div>
          <div className="admin-fulfillment-stat">
            <div>
              <span>Ready to ship</span>
              <strong>{fulfillment.readyToShip ?? 0} orders</strong>
            </div>
            <span className="fulfillment-bar fulfillment-green">
              <i style={{ width: `${(fulfillment.unfulfilledOrders || 0) + (fulfillment.readyToShip || 0) ? ((fulfillment.readyToShip || 0) / ((fulfillment.unfulfilledOrders || 0) + (fulfillment.readyToShip || 0))) * 100 : 0}%` }} />
            </span>
          </div>
          <div className="admin-fulfillment-note">
            <span className="fulfillment-dot" />
            {fulfillment.averageFulfillmentDays
              ? <>Average fulfillment time <strong>{fulfillment.averageFulfillmentDays} days{fulfillment.fulfillmentTimeIsEstimated ? " (estimated)" : ""}</strong></>
              : "Average fulfillment time estimate unavailable"}
          </div>
          <button
            className="admin-button admin-button-secondary admin-full-button"
            onClick={() => window.location.assign("/admin/orders")}
          >
            Manage fulfillment <ArrowRight size={15} />
          </button>
        </article>
      </section>
      <div className="admin-page-footnote">
        <span>Showing live store data</span>
        <span>Updated just now</span>
      </div>
    </div>
  );
}
