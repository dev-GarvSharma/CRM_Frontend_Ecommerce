import { useEffect, useState } from "react";
import { PageHeading, LoadingState, ErrorState } from "../components/AdminPrimitives.jsx";
import { formatRupees } from "../models/catalog.js";
import {
  createCoupon,
  createPromotion,
  getAbandonedCarts,
  getAuditHistory,
  getCoupons,
  getInventoryVariants,
  getPromotions,
  updateCoupon,
  updatePromotion,
} from "./operationsApi.js";

export default function Operations({ onNotify }) {
  const [coupons, setCoupons] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [abandoned, setAbandoned] = useState([]);
  const [audit, setAudit] = useState([]);
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [updatingCouponId, setUpdatingCouponId] = useState(null);
  const [updatingPromotionId, setUpdatingPromotionId] = useState(null);

  const load = async () => {
    setLoading(true);
    setFailed(false);
    const [couponResult, promotionResult, abandonedResult, auditResult, inventoryResult] = await Promise.all([
      getCoupons(), getPromotions(), getAbandonedCarts(), getAuditHistory(), getInventoryVariants(),
    ]);
    if ([couponResult, promotionResult, abandonedResult, auditResult, inventoryResult].some((result) => !result.success)) {
      setFailed(true);
      setLoading(false);
      return;
    }
    setCoupons(couponResult.data?.data || []);
    setPromotions(promotionResult.data?.data || []);
    setAbandoned(abandonedResult.data?.data || []);
    setAudit(auditResult.data?.data || []);
    setVariants(inventoryResult.data?.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const submitCoupon = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    const result = await createCoupon({
      code: String(form.get("code")).trim().toUpperCase(),
      type: form.get("type"),
      value: Number(form.get("value")),
      minOrder: Number(form.get("minOrder") || 0),
      maxDiscount: form.get("maxDiscount") ? Number(form.get("maxDiscount")) : null,
      usageLimit: form.get("usageLimit") ? Number(form.get("usageLimit")) : null,
      perUserLimit: form.get("perUserLimit") ? Number(form.get("perUserLimit")) : null,
      startsAt: form.get("startsAt") || null,
      expiresAt: form.get("expiresAt") || null,
      active: true,
    });
    setBusy(false);
    if (!result.success) return onNotify(result.message || "Could not create coupon.");
    event.currentTarget.reset();
    onNotify("Coupon created.");
    await load();
  };

  const submitPromotion = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    const result = await createPromotion({
      code: String(form.get("code")).trim().toUpperCase(),
      name: String(form.get("name")).trim(),
      type: "free_product",
      promotionalVariantId: form.get("variantId"),
      minimumSubtotal: Number(form.get("minimumSubtotal") || 0),
      usageLimit: form.get("usageLimit") ? Number(form.get("usageLimit")) : null,
      active: true,
    });
    setBusy(false);
    if (!result.success) return onNotify(result.message || "Could not create promotion.");
    event.currentTarget.reset();
    onNotify("Free-product promotion created.");
    await load();
  };

  const toggleCoupon = async (coupon) => {
    setUpdatingCouponId(coupon.id);
    const result = await updateCoupon(coupon.id, { active: !coupon.active });
    if (result.success) await load();
    else onNotify(result.message || "Could not update coupon.");
    setUpdatingCouponId(null);
  };
  const togglePromotion = async (promotion) => {
    setUpdatingPromotionId(promotion.id);
    const result = await updatePromotion(promotion.id, { active: !promotion.active });
    if (result.success) await load();
    else onNotify(result.message || "Could not update promotion.");
    setUpdatingPromotionId(null);
  };

  if (loading) return <LoadingState label="Loading coupons and store activity" />;
  if (failed) return <ErrorState retry={load} />;

  return (
    <div className="admin-page-content">
      <PageHeading eyebrow="STORE OPERATIONS" title="Coupons and activity" description="Manage coupons, free-product promotions, abandoned carts, and audit history." />
      <div className="admin-dashboard-grid">
        <section className="admin-panel admin-settings-panel">
          <div className="admin-panel-heading"><div><h2>Create coupon</h2><p>Discount coupons are checked again at checkout.</p></div></div>
          <form className="admin-form-grid" onSubmit={submitCoupon}>
            <label className="admin-form-label">Code<input name="code" required maxLength={40} pattern="[A-Za-z0-9_-]+" /></label>
            <label className="admin-form-label">Discount type<select name="type"><option value="percentage">Percentage</option><option value="fixed">Fixed amount</option></select></label>
            <label className="admin-form-label">Value<input name="value" required type="number" min="0.01" step="0.01" /></label>
            <label className="admin-form-label">Minimum order<input name="minOrder" type="number" min="0" step="0.01" defaultValue="0" /></label>
            <label className="admin-form-label">Maximum discount<input name="maxDiscount" type="number" min="0.01" step="0.01" placeholder="No cap" /></label>
            <label className="admin-form-label">Total usage limit<input name="usageLimit" type="number" min="1" placeholder="Unlimited" /></label>
            <label className="admin-form-label">Uses per customer<input name="perUserLimit" type="number" min="1" placeholder="Unlimited" /></label>
            <label className="admin-form-label">Start date<input name="startsAt" type="datetime-local" /></label>
            <label className="admin-form-label">End date<input name="expiresAt" type="datetime-local" /></label>
            <button className="admin-button admin-button-dark" disabled={busy}>{busy ? "Creating…" : "Create coupon"}</button>
          </form>
        </section>
        <section className="admin-panel admin-settings-panel">
          <div className="admin-panel-heading"><div><h2>Create free-product offer</h2><p>Add a free perfume size when the cart reaches a minimum spend.</p></div></div>
          <form className="admin-form-grid" onSubmit={submitPromotion}>
            <label className="admin-form-label">Offer name<input name="name" required maxLength={160} /></label>
            <label className="admin-form-label">Code<input name="code" required maxLength={50} pattern="[A-Za-z0-9_-]+" /></label>
            <label className="admin-form-label">Free product size<select name="variantId" required defaultValue=""><option value="" disabled>Select variant</option>{variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.product?.name} · {variant.sku} · {Object.values(variant.options || {}).join(" / ")}</option>)}</select></label>
            <label className="admin-form-label">Minimum cart total (₹)<input name="minimumSubtotal" type="number" min="0" step="0.01" defaultValue="0" /></label>
            <label className="admin-form-label">Usage limit<input name="usageLimit" type="number" min="1" /></label>
            <button className="admin-button admin-button-dark" disabled={busy}>{busy ? "Creating…" : "Create offer"}</button>
          </form>
        </section>
      </div>

      <section className="admin-panel admin-table-panel">
        <div className="admin-panel-heading"><div><h2>Coupons</h2><p>{coupons.length} records</p></div></div>
        <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>CODE</th><th>TYPE</th><th>VALUE</th><th>MINIMUM</th><th>MAX DISCOUNT</th><th>DATES</th><th>USES</th><th>PER CUSTOMER</th><th>STATUS</th><th /></tr></thead><tbody>
          {coupons.map((coupon) => <tr key={coupon.id}><td><strong>{coupon.code}</strong></td><td>{coupon.type}</td><td>{coupon.type === "percentage" ? `${coupon.value}%` : formatRupees(coupon.value)}</td><td>{formatRupees(coupon.minOrder)}</td><td>{coupon.type === "percentage" ? (coupon.maxDiscount ? formatRupees(coupon.maxDiscount) : "No cap") : "—"}</td><td>{coupon.startsAt ? new Date(coupon.startsAt).toLocaleDateString() : "Anytime"} – {coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString() : "No end"}</td><td>{coupon.usedCount}{coupon.usageLimit ? ` / ${coupon.usageLimit}` : ""}</td><td>{coupon.perUserLimit || "Unlimited"}</td><td>{coupon.active ? "Active" : "Inactive"}</td><td><button className="admin-button admin-button-secondary" disabled={updatingCouponId === coupon.id} onClick={() => toggleCoupon(coupon)}>{updatingCouponId === coupon.id ? "Updating…" : coupon.active ? "Deactivate" : "Activate"}</button></td></tr>)}
        </tbody></table></div>
      </section>

      <section className="admin-panel admin-table-panel">
        <div className="admin-panel-heading"><div><h2>Promotions</h2><p>Free-product offers attached to carts.</p></div></div>
        <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>OFFER</th><th>CODE</th><th>FREE VARIANT</th><th>MINIMUM</th><th>USES</th><th>STATUS</th><th /></tr></thead><tbody>
          {promotions.map((promotion) => <tr key={promotion.id}><td>{promotion.name}</td><td><strong>{promotion.code}</strong></td><td>{promotion.promotionalVariantId}</td><td>{formatRupees(promotion.minimumSubtotal)}</td><td>{promotion.usedCount}{promotion.usageLimit ? ` / ${promotion.usageLimit}` : ""}</td><td>{promotion.active ? "Active" : "Inactive"}</td><td><button className="admin-button admin-button-secondary" disabled={updatingPromotionId === promotion.id} onClick={() => togglePromotion(promotion)}>{updatingPromotionId === promotion.id ? "Updating…" : promotion.active ? "Deactivate" : "Activate"}</button></td></tr>)}
        </tbody></table></div>
      </section>

      <section className="admin-panel admin-table-panel">
        <div className="admin-panel-heading"><div><h2>Abandoned carts</h2><p>Customer responses and carts inactive for 24 hours.</p></div></div>
        <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>CUSTOMER</th><th>PHONE</th><th>ITEMS</th><th>REASON</th><th>COMMENT</th><th>ABANDONED</th></tr></thead><tbody>
          {abandoned.map((session) => { const cart = session.Cart || session.cart || {}; const customer = cart.user || {}; const items = cart.items || []; return <tr key={session.id}><td>{customer.name || "Account"}</td><td>{customer.phone || "—"}</td><td>{items.length}</td><td>{session.abandonmentReason || "Automatic"}</td><td>{session.abandonmentComment || "—"}</td><td>{session.abandonedAt ? new Date(session.abandonedAt).toLocaleString() : "—"}</td></tr>; })}
        </tbody></table></div>
      </section>

      <section className="admin-panel admin-table-panel">
        <div className="admin-panel-heading"><div><h2>Administrative history</h2><p>Recent role, settings, catalog, customer, and inventory changes.</p></div></div>
        <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>TIME</th><th>ACTOR</th><th>ACTION</th><th>RESOURCE</th><th>CHANGES</th></tr></thead><tbody>
          {audit.map((entry) => <tr key={entry.id}><td>{new Date(entry.createdAt).toLocaleString()}</td><td>{entry.actor?.name || entry.actorUserId || "System"}</td><td>{entry.action}</td><td>{entry.resourceType} {entry.resourceId || ""}</td><td><code>{JSON.stringify(entry.changes || {})}</code></td></tr>)}
        </tbody></table></div>
      </section>
    </div>
  );
}
