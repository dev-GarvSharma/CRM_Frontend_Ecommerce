import { useEffect, useState } from "react";
import { ArrowDownToLine, BellRing, PackageCheck, X } from "lucide-react";
import {
  getInventory,
  restockInventory,
  updateInventory,
  exportInventoryReport,
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
import AdminPortal from "../../components/AdminPortal.jsx";
import {
  formatRupees,
  getProductsFromVariants,
} from "../../models/catalog.js";
import { downloadCsv } from "../../services/exportCsv.js";

export default function Inventory({ globalSearch = "", onNotify }) {
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All stock");
  const [stockUpdates, setStockUpdates] = useState({});
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [savingAdjustment, setSavingAdjustment] = useState(false);
  const [restockingId, setRestockingId] = useState(null);
  const [adjustingProduct, setAdjustingProduct] = useState("");
  const [page, setPage] = useState(1);
  const [records, setRecords] = useState(20);
  const load = () => {
    setLoading(true);
    setFailed(false);
    getInventory(page, records)
      .then((result) => {
        if (result.success) setResponse(result);
        else setFailed(true);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    getInventory(page, records)
      .then((result) => {
        if (result.success) setResponse(result);
        else setFailed(true);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [page, records]);
  if (loading) return <LoadingState label="Checking inventory levels" />;
  if (failed) return <ErrorState retry={load} />;
  const products = getProductsFromVariants(response?.data?.data || []).map((product) => {
    const stock = stockUpdates[product.id] ?? product.stock;
    return {
      ...product,
      stock,
      status:
        stock === 0 ? "Out of stock" : stock < 10 ? "Low stock" : "In stock",
    };
  });
  const visible = products.filter(
    (item) =>
      `${item.name} ${item.sku}`
        .toLowerCase()
        .includes((globalSearch.trim() || query).toLowerCase().trim()) &&
      (filter === "All stock" ||
        (filter === "Low stock"
          ? item.status !== "In stock"
          : item.status === filter)),
  );
  const low = products.filter((item) => item.status !== "In stock");
  const exportReport = async () => {
    const result = await exportInventoryReport();
    const rows = result.data?.data || [];
    onNotify(result.success
      ? downloadCsv("perfume-inventory.csv", rows.map((variant) => ({
          sku: variant.sku,
          product: variant.product?.name,
          options: variant.options,
          price: variant.price,
          stock: variant.stock,
        }))) ? "Inventory report downloaded." : "No inventory to export."
      : result.message || "Could not export inventory.");
  };
  const restock = async (product) => {
    setRestockingId(product.id);
    const result = await restockInventory(product.id, 10);
    setRestockingId(null);
    if (!result.success) {
      onNotify(result.message || "Could not restock this product.");
      return;
    }
    setStockUpdates((current) => ({ ...current, [product.id]: product.stock + 10 }));
    onNotify(`${product.name} variant restocked.`);
  };
  const saveAdjustment = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const variantId = String(form.get("variantId"));
    const quantity = Number(form.get("quantity"));
    setSavingAdjustment(true);
    const result = await updateInventory(variantId, quantity);
    setSavingAdjustment(false);
    if (!result.success) {
      onNotify(result.message || "Could not adjust inventory.");
      return;
    }
    setStockUpdates((current) => ({ ...current, [variantId]: quantity }));
    setAdjustOpen(false);
    onNotify("Inventory quantity updated.");
  };
  return (
    <div className="admin-page-content">
      <PageHeading
        eyebrow="OPERATIONS"
        title="Inventory"
        description="Track stock by perfume product size and SKU."
        action={
          <div className="admin-heading-actions">
            <button
              className="admin-button admin-button-secondary"
              onClick={exportReport}
            >
              <ArrowDownToLine size={16} />
              Export stock
            </button>
            <button
              className="admin-button admin-button-dark"
              onClick={() => {
                setAdjustingProduct(String(products[0]?.id || ""));
                setAdjustOpen(true);
              }}
            >
              <PackageCheck size={16} />
              Adjust stock
            </button>
          </div>
        }
      />
      {low.length > 0 && (
        <div className="admin-stock-alert">
          <div>
            <BellRing size={18} />
            <strong>{low.length} products need your attention</strong>
            <span>{low.map((item) => item.name).join(", ")}</span>
          </div>
          <button onClick={() => setFilter("Low stock")}>
            Review low stock
          </button>
        </div>
      )}
      <div className="admin-summary-strip">
        <div>
          <span>Tracked products</span>
          <strong>{products.length}</strong>
        </div>
        <div>
          <span>In stock</span>
          <strong>
            {products.filter((item) => item.status === "In stock").length}
          </strong>
        </div>
        <div>
          <span>Low stock</span>
          <strong className="text-warn">
            {products.filter((item) => item.status === "Low stock").length}
          </strong>
        </div>
        <div>
          <span>Out of stock</span>
          <strong className="text-danger">
            {products.filter((item) => item.status === "Out of stock").length}
          </strong>
        </div>
      </div>
      <section className="admin-panel admin-table-panel">
        <div className="admin-list-toolbar">
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Search inventory"
          />
          <SelectField
            value={filter}
            onChange={setFilter}
            options={["All stock", "In stock", "Low stock", "Out of stock"]}
            ariaLabel="Filter inventory by stock"
          />
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>PRODUCT</th>
                <th>SKU</th>
                <th>UNIT PRICE</th>
                <th>AVAILABLE</th>
                <th>STOCK VALUE</th>
                <th>STATUS</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="admin-product-cell">
                      <div className="admin-product-thumb">
                        {item.image && <img src={item.image} alt="" />}
                      </div>
                      <div>
                        <strong>{item.name}</strong>
                        <span>{Object.values(item.options).join(" / ")}</span>
                      </div>
                    </div>
                  </td>
                  <td className="admin-code">{item.sku}</td>
                  <td>{formatRupees(item.price)}</td>
                  <td>
                    <strong>{item.stock}</strong> units
                  </td>
                  <td className="admin-table-total">
                    {formatRupees(item.stock * item.price)}
                  </td>
                  <td>
                    <StatusPill>{item.status}</StatusPill>
                  </td>
                  <td>
                    <button
                      className="admin-text-button"
                      disabled={restockingId === item.id}
                      onClick={() => restock(item)}
                    >
                      {restockingId === item.id ? "Restocking…" : "Restock"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!visible.length && <EmptyState title="No stock records match" />}
        </div>
        <ListPagination meta={response?.data?.meta} page={page} records={records} onPageChange={setPage} onRecordsChange={(size) => { setPage(1); setRecords(size); }} label="products" />
      </section>
      {adjustOpen && (
        <AdminPortal>
          <div
            className="admin-modal-backdrop"
            onMouseDown={(event) =>
              event.target === event.currentTarget && setAdjustOpen(false)
            }
          >
            <form className="admin-modal" onSubmit={saveAdjustment}>
              <div className="admin-modal-header">
                <div>
                  <span className="admin-eyebrow">STOCK CONTROL</span>
                  <h2>Adjust inventory</h2>
                </div>
                <button
                  type="button"
                  className="admin-icon-button"
                  aria-label="Close"
                  onClick={() => setAdjustOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>
              <label>
                Product
                <select
                  name="variantId"
                  value={adjustingProduct}
                  onChange={(event) => setAdjustingProduct(event.target.value)}
                >
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} · {Object.values(product.options).join(" / ")}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Available quantity
                <input
                  name="quantity"
                  type="number"
                  min="0"
                  required
                  defaultValue={
                    products.find(
                      (product) => String(product.id) === adjustingProduct,
                    )?.stock || 0
                  }
                  key={adjustingProduct}
                />
              </label>
              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-button admin-button-secondary"
                  onClick={() => setAdjustOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAdjustment}
                  className="admin-button admin-button-dark"
                >
                  <PackageCheck size={15} />
                  {savingAdjustment ? "Saving…" : "Save quantity"}
                </button>
              </div>
            </form>
          </div>
        </AdminPortal>
      )}
    </div>
  );
}
