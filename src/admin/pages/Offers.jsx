import { useEffect, useState } from "react";
import { Pencil, Plus, X } from "lucide-react";
import { PageHeading, LoadingState, ErrorState, EmptyState } from "../components/AdminPrimitives.jsx";
import { formatRupees } from "../models/catalog.js";
import { createCoupon, getCoupons, updateCoupon } from "./operationsApi.js";

export default function Offers({ globalSearch = "", onNotify }) {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [saving, setSaving] = useState(false);
  const [updatingCouponId, setUpdatingCouponId] = useState(null);
  const load = async () => {
    setLoading(true);
    const result = await getCoupons();
    setFailed(!result.success);
    if (result.success) setCoupons(result.data?.data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  const openCreate = () => {
    setEditingCoupon(null);
    setModalOpen(true);
  };
  const openEdit = (coupon) => {
    setEditingCoupon(coupon);
    setModalOpen(true);
  };
  const toLocalDateTime = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  };
  const submit = async (event) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setSaving(true);
    const couponValues = {
      code: String(values.get("code")).trim().toUpperCase(),
      type: values.get("type"),
      value: Number(values.get("value")),
      minOrder: Number(values.get("minOrder") || 0),
      maxDiscount: values.get("maxDiscount") ? Number(values.get("maxDiscount")) : null,
      usageLimit: values.get("usageLimit") ? Number(values.get("usageLimit")) : null,
      perUserLimit: values.get("perUserLimit") ? Number(values.get("perUserLimit")) : null,
      startsAt: values.get("startsAt") || null,
      expiresAt: values.get("expiresAt") || null,
      active: editingCoupon ? editingCoupon.active : true,
    };
    const result = editingCoupon
      ? await updateCoupon(editingCoupon.id, couponValues)
      : await createCoupon(couponValues);
    setSaving(false);
    if (!result.success)
      return onNotify(result.message || `Could not ${editingCoupon ? "update" : "create"} coupon.`);
    setModalOpen(false);
    onNotify(editingCoupon ? "Coupon updated." : "Coupon created.");
    setEditingCoupon(null);
    await load();
  };
  const toggle = async (coupon) => {
    setUpdatingCouponId(coupon.id);
    const result = await updateCoupon(coupon.id, { active: !coupon.active });
    if (result.success) await load();
    else onNotify(result.message || "Could not update coupon.");
    setUpdatingCouponId(null);
  };
  if (loading) return <LoadingState label="Loading coupons" />;
  if (failed) return <ErrorState retry={load} />;
  const visibleCoupons = coupons.filter((coupon) => `${coupon.code} ${coupon.type} ${coupon.active ? "active" : "inactive"}`.toLowerCase().includes(globalSearch.trim().toLowerCase()));
  return <div className="admin-page-content">
    <PageHeading eyebrow="DISCOUNTS" title="Coupons" description="Create and manage discount codes for checkout." action={<button className="admin-button admin-button-dark" onClick={openCreate}><Plus size={16} /> New coupon</button>} />
    <section className="admin-panel admin-table-panel"><div className="admin-panel-heading"><div><h2>Discount coupons</h2><p>{coupons.length} coupons</p></div></div>
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>CODE</th><th>DISCOUNT</th><th>MINIMUM ORDER</th><th>MAX DISCOUNT</th><th>DATES</th><th>USES</th><th>PER CUSTOMER</th><th>STATUS</th><th /></tr></thead><tbody>
        {visibleCoupons.map((coupon) => <tr key={coupon.id}><td><strong>{coupon.code}</strong></td><td>{coupon.type === "percentage" ? `${coupon.value}%` : formatRupees(coupon.value)}</td><td>{formatRupees(coupon.minOrder)}</td><td>{coupon.type === "percentage" ? (coupon.maxDiscount ? formatRupees(coupon.maxDiscount) : "No cap") : "—"}</td><td>{coupon.startsAt ? new Date(coupon.startsAt).toLocaleDateString() : "Anytime"} – {coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString() : "No end"}</td><td>{coupon.usedCount || 0}{coupon.usageLimit ? ` / ${coupon.usageLimit}` : ""}</td><td>{coupon.perUserLimit || "Unlimited"}</td><td>{coupon.active ? "Active" : "Inactive"}</td><td><div className="admin-heading-actions"><button className="admin-button admin-button-secondary" onClick={() => openEdit(coupon)}><Pencil size={14} /> Edit</button><button className="admin-button admin-button-secondary" disabled={updatingCouponId === coupon.id} onClick={() => toggle(coupon)}>{updatingCouponId === coupon.id ? "Updating…" : coupon.active ? "Deactivate" : "Activate"}</button></div></td></tr>)}
      </tbody></table>{!visibleCoupons.length && <EmptyState title={coupons.length ? "No matching coupons" : "No coupons yet"} detail="Create a coupon to make it available at checkout." />}</div>
    </section>
    {modalOpen && <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setModalOpen(false)}><form className="admin-modal" onSubmit={submit}>
      <div className="admin-modal-header"><div><span className="admin-eyebrow">CHECKOUT DISCOUNT</span><h2>{editingCoupon ? "Edit coupon" : "Create coupon"}</h2></div><button type="button" className="admin-icon-button" disabled={saving} onClick={() => { setModalOpen(false); setEditingCoupon(null); }} aria-label="Close"><X size={18} /></button></div>
      <label>Coupon code<input name="code" required maxLength={40} pattern="[A-Za-z0-9_-]+" placeholder="SUMMER10" defaultValue={editingCoupon?.code || ""} /></label>
      <div className="admin-form-row"><label>Discount type<select name="type" defaultValue={editingCoupon?.type || "percentage"}><option value="percentage">Percentage</option><option value="fixed">Fixed amount</option></select></label><label>Value<input name="value" required type="number" min="0.01" step="0.01" defaultValue={editingCoupon?.value ?? ""} /></label></div>
      <div className="admin-form-row"><label>Minimum order<input name="minOrder" type="number" min="0" step="0.01" defaultValue={editingCoupon?.minOrder ?? 0} /></label><label>Maximum discount<input name="maxDiscount" type="number" min="0.01" step="0.01" placeholder="No cap" defaultValue={editingCoupon?.maxDiscount ?? ""} /><small>Applies to percentage discounts.</small></label></div>
      <div className="admin-form-row"><label>Total usage limit<input name="usageLimit" type="number" min="1" placeholder="Unlimited" defaultValue={editingCoupon?.usageLimit ?? ""} /></label><label>Uses per customer<input name="perUserLimit" type="number" min="1" placeholder="Unlimited" defaultValue={editingCoupon?.perUserLimit ?? ""} /><small>Limit how many times each customer can use this code.</small></label></div>
      <div className="admin-form-row"><label>Start date<input name="startsAt" type="datetime-local" defaultValue={toLocalDateTime(editingCoupon?.startsAt)} /></label><label>End date<input name="expiresAt" type="datetime-local" defaultValue={toLocalDateTime(editingCoupon?.expiresAt)} /></label></div>
      <div className="admin-modal-footer"><button type="button" className="admin-button admin-button-secondary" disabled={saving} onClick={() => { setModalOpen(false); setEditingCoupon(null); }}>Cancel</button><button className="admin-button admin-button-dark" disabled={saving}>{saving ? "Saving…" : editingCoupon ? "Save changes" : "Create coupon"}</button></div>
    </form></div>}
  </div>;
}
