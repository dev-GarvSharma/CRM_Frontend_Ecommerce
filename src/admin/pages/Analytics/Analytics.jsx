import { useEffect, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpRight,
  CalendarDays,
  Download,
} from "lucide-react";
import { getAnalytics } from "./api.js";
import {
  ErrorState,
  LoadingState,
  PageHeading,
  SelectField,
} from "../../components/AdminPrimitives.jsx";
import { formatRupees } from "../../models/catalog.js";
import { downloadCsv } from "../../services/exportCsv.js";

export default function Analytics({ onNotify }) {
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [period, setPeriod] = useState("Last 30 days");
  const periodValue = {
    "Last 7 days": "7d",
    "Last 30 days": "30d",
    "Last 90 days": "90d",
  }[period] || "30d";
  const load = () => {
    setLoading(true);
    setFailed(false);
    getAnalytics(periodValue)
      .then((result) => {
        if (result.success) setResponse(result);
        else setFailed(true);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    getAnalytics(periodValue)
      .then((result) => {
        if (result.success) setResponse(result);
        else setFailed(true);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [periodValue]);
  if (loading) return <LoadingState label="Preparing store analytics" />;
  if (failed) return <ErrorState retry={load} />;
  const analytics = response?.data?.data || {};
  const metrics = analytics.metrics || {};
  const salesOverTime = Array.isArray(analytics.salesOverTime)
    ? analytics.salesOverTime
    : [];
  const salesByChannel = Array.isArray(analytics.salesByChannel)
    ? analytics.salesByChannel
    : [];
  const topProducts = Array.isArray(analytics.topProducts)
    ? analytics.topProducts
    : [];
  const totalSales = Number(metrics.totalSales?.value ?? analytics.revenue ?? 0);
  const maxRevenue = Math.max(...salesOverTime.map((item) => Number(item.revenue) || 0), 0);
  const bars = salesOverTime.map((item) => ({
    ...item,
    height: maxRevenue ? Math.max((Number(item.revenue || 0) / maxRevenue) * 100, 2) : 0,
  }));
  const channelStyles = ["channel-web", "channel-social", "channel-direct"];
  const chartLabels = bars.length
    ? [0, 1, 2, 3, 4, 5, 6].map((position) => {
        const index = Math.round((position * (bars.length - 1)) / 6);
        const date = bars[index]?.date;
        return date
          ? new Intl.DateTimeFormat("en", { month: "short", day: "2-digit" }).format(new Date(`${date}T00:00:00`))
          : "";
      })
    : [];
  const periodDates = bars.length
    ? `${chartLabels[0]} – ${chartLabels[chartLabels.length - 1]}`
    : period;
  const exportReport = async () => {
    const result = await getAnalytics(periodValue);
    const report = result.data?.data;
    if (!result.success || !report) {
      onNotify(result.message || "Could not export analytics.");
      return;
    }
    const rows = [
      ...Object.entries(report.metrics || {}).map(([metric, values]) => ({
        type: "metric",
        name: metric,
        value: values?.value ?? values,
        changePercent: values?.changePercent ?? "",
      })),
      ...(report.salesOverTime || []).map((day) => ({ type: "daily-sales", ...day })),
      ...(report.topProducts || []).map((product) => ({ type: "top-product", ...product })),
    ];
    onNotify(downloadCsv(`analytics-${periodValue}.csv`, rows) ? "Analytics report downloaded." : "No analytics data to export.");
  };
  return (
    <div className="admin-page-content">
      <PageHeading
        eyebrow="PERFORMANCE"
        title="Analytics"
        description="A clear view of sales, products and customer momentum."
        action={
          <div className="admin-heading-actions">
            <SelectField
              value={period}
              onChange={setPeriod}
              options={["Last 7 days", "Last 30 days", "Last 90 days"]}
              ariaLabel="Analytics date range"
            />
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
      <div className="admin-summary-strip">
        <div>
          <span>Total sales</span>
          <strong>
            {formatRupees(totalSales)}
          </strong>
          <small className="change-up">
            <ArrowUpRight size={12} />
            {Number(metrics.totalSales?.changePercent ?? 0)}%
          </small>
        </div>
        <div>
          <span>Orders</span>
          <strong>{metrics.orders?.value ?? analytics.orders ?? 0}</strong>
          <small className="change-up">
            <ArrowUpRight size={12} />
            {Number(metrics.orders?.changePercent ?? 0)}%
          </small>
        </div>
        <div>
          <span>Average order value</span>
          <strong>{formatRupees(metrics.averageOrderValue?.value ?? 0)}</strong>
          <small className="change-up">
            <ArrowUpRight size={12} />
            {Number(metrics.averageOrderValue?.changePercent ?? 0)}%
          </small>
        </div>
        <div>
          <span>Items sold</span>
          <strong>{metrics.itemsSold?.value ?? 0}</strong>
          <small className={Number(metrics.itemsSold?.changePercent ?? 0) < 0 ? "change-down" : "change-up"}>
            {Number(metrics.itemsSold?.changePercent ?? 0)}%
          </small>
        </div>
      </div>
      <section className="admin-panel admin-analytics-chart">
        <div className="admin-panel-heading">
          <div>
            <h2>Sales over time</h2>
            <p>Daily revenue · {period.toLowerCase()}</p>
          </div>
          <button className="admin-button admin-button-secondary">
            <CalendarDays size={15} />
            {periodDates}
          </button>
        </div>
        <div className="admin-big-chart">
          <div className="admin-chart-axis">
            <span>₹10k</span>
            <span>₹7.5k</span>
            <span>₹5k</span>
            <span>₹2.5k</span>
            <span>₹0</span>
          </div>
          <div className="admin-chart-plot">
            <div className="admin-chart-gridlines">
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
            <div className="admin-bar-chart">
              {bars.map((item, index) => (
                <div
                  key={item.date}
                  style={{ height: `${item.height}%` }}
                  className={index === bars.length - 1 ? "bar-highlight" : ""}
                  title={`${item.date}: ${formatRupees(item.revenue)}`}
                />
              ))}
            </div>
            <div className="admin-chart-days">
              {chartLabels.map((label, index) => <span key={`${label}-${index}`}>{label}</span>)}
            </div>
          </div>
        </div>
      </section>
      <div className="admin-bottom-grid">
        <section className="admin-panel admin-insight-panel">
          <div className="admin-panel-heading">
            <div>
              <h2>Sales by channel</h2>
              <p>Where your orders come from</p>
            </div>
          </div>
          {salesByChannel.map((channel, index) => {
            const revenue = Number(channel.revenue) || 0;
            const share = totalSales ? (revenue / totalSales) * 100 : 0;
            return (
              <div className="admin-channel-row" key={channel.channel}>
                <span className={`channel-dot ${channelStyles[index % channelStyles.length]}`} />
                <span>{channel.channel}</span>
                <strong>{share.toFixed(0)}%</strong>
                <div><i style={{ width: `${share}%` }} /></div>
                <small>{formatRupees(revenue)}</small>
              </div>
            );
          })}
        </section>
        <section className="admin-panel admin-insight-panel">
          <div className="admin-panel-heading">
            <div>
              <h2>Top products</h2>
              <p>Most ordered in this period</p>
            </div>
          </div>
          {topProducts.slice(0, 4).map((item, index) => (
            <div className="admin-analytics-product" key={item.productId}>
              <span className="admin-product-rank">0{index + 1}</span>
              <div>
                <strong>{item.name}</strong>
                <small>{item.quantity} units sold · {item.sku}</small>
              </div>
              <strong>{formatRupees(item.revenue)}</strong>
            </div>
          ))}
        </section>
      </div>
      <button
        className="admin-text-button analytics-export"
        onClick={exportReport}
      >
        <ArrowDownToLine size={15} />
        Download detailed report
      </button>
    </div>
  );
}
