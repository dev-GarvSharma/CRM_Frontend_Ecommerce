import { useEffect, useState } from "react";
import { Pencil, Plus, X } from "lucide-react";
import { PageHeading, LoadingState, ErrorState, EmptyState } from "../components/AdminPrimitives.jsx";
import { formatRupees } from "../models/catalog.js";
import { createPromotion, getInventoryVariants, getPromotions, updatePromotion } from "./operationsApi.js";

export default function Promotions({ globalSearch = "", onNotify }) {
  const [promotions, setPromotions] = useState([]);
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState(null);
  const [saving, setSaving] = useState(false);
  const [updatingPromotionId, setUpdatingPromotionId] = useState(null);
  const load = async () => {
    setLoading(true);
    const [offers, stock] = await Promise.all([getPromotions(), getInventoryVariants()]);
    setFailed(!offers.success || !stock.success);
    if (offers.success) setPromotions(offers.data?.data || []);
    if (stock.success) setVariants(stock.data?.data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  const openCreate = () => {
    setEditingPromotion(null);
    setModalOpen(true);
  };
  const openEdit = (promotion) => {
    setEditingPromotion(promotion);
    setModalOpen(true);
  };
  const submit = async (event) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setSaving(true);
    const promotionValues = {
      code: String(values.get("code")).trim().toUpperCase(),
      name: String(values.get("name")).trim(),
      type: "free_product",
      promotionalVariantId: values.get("variantId"),
      minimumSubtotal: Number(values.get("minimumSubtotal") || 0),
      usageLimit: values.get("usageLimit") ? Number(values.get("usageLimit")) : null,
      active: editingPromotion ? editingPromotion.active : true,
    };
    const result = editingPromotion
      ? await updatePromotion(editingPromotion.id, promotionValues)
      : await createPromotion(promotionValues);
    setSaving(false);
    if (!result.success)
      return onNotify(result.message || `Could not ${editingPromotion ? "update" : "create"} promotion.`);
    setModalOpen(false);
    onNotify(editingPromotion ? "Promotional product updated." : "Promotional product created.");
    setEditingPromotion(null);
    await load();
  };
  const toggle = async (promotion) => {
    setUpdatingPromotionId(promotion.id);
    const result = await updatePromotion(promotion.id, { active: !promotion.active });
    if (result.success) await load();
    else onNotify(result.message || "Could not update promotion.");
    setUpdatingPromotionId(null);
  };
  if (loading) return <LoadingState label="Loading promotional products" />;
  if (failed) return <ErrorState retry={load} />;
  const variantName = (id) => { const variant = variants.find((item) => item.id === id); return variant ? `${variant.product?.name || "Perfume"} · ${Object.values(variant.options || {}).join(" / ") || variant.sku}` : id; };
  const visiblePromotions = promotions.filter((promotion) => `${promotion.name} ${promotion.code} ${variantName(promotion.promotionalVariantId)}`.toLowerCase().includes(globalSearch.trim().toLowerCase()));
  return <div className="admin-page-content">
    <PageHeading eyebrow="FREE PRODUCT CAMPAIGNS" title="Promotional products" description="Attach a free perfume variant to qualifying carts." action={<button className="admin-button admin-button-dark" onClick={openCreate}><Plus size={16} /> New promotion</button>} />
    <section className="admin-panel admin-table-panel"><div className="admin-panel-heading"><div><h2>Promotional products</h2><p>{promotions.length} campaigns</p></div></div>
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>CAMPAIGN</th><th>CODE</th><th>FREE VARIANT</th><th>MINIMUM CART</th><th>USES</th><th>STATUS</th><th /></tr></thead><tbody>
        {visiblePromotions.map((promotion) => <tr key={promotion.id}><td>{promotion.name}</td><td><strong>{promotion.code}</strong></td><td>{variantName(promotion.promotionalVariantId)}</td><td>{formatRupees(promotion.minimumSubtotal)}</td><td>{promotion.usedCount || 0}{promotion.usageLimit ? ` / ${promotion.usageLimit}` : ""}</td><td>{promotion.active ? "Active" : "Inactive"}</td><td><div className="admin-heading-actions"><button className="admin-button admin-button-secondary" onClick={() => openEdit(promotion)}><Pencil size={14} /> Edit</button><button className="admin-button admin-button-secondary" disabled={updatingPromotionId === promotion.id} onClick={() => toggle(promotion)}>{updatingPromotionId === promotion.id ? "Updating…" : promotion.active ? "Deactivate" : "Activate"}</button></div></td></tr>)}
      </tbody></table>{!visiblePromotions.length && <EmptyState title={promotions.length ? "No matching promotions" : "No promotions yet"} detail="Create a free-product campaign to show it here." />}</div>
    </section>
    {modalOpen && <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setModalOpen(false)}><form className="admin-modal" onSubmit={submit}>
      <div className="admin-modal-header"><div><span className="admin-eyebrow">FREE PRODUCT</span><h2>{editingPromotion ? "Edit promotional product" : "Create promotional product"}</h2></div><button type="button" className="admin-icon-button" disabled={saving} onClick={() => { setModalOpen(false); setEditingPromotion(null); }} aria-label="Close"><X size={18} /></button></div>
      <label>Campaign name<input name="name" required maxLength={160} defaultValue={editingPromotion?.name || ""} /></label><label>Offer code<input name="code" required maxLength={50} pattern="[A-Za-z0-9_-]+" defaultValue={editingPromotion?.code || ""} /></label>
      <label>Free perfume variant<select name="variantId" required defaultValue={editingPromotion?.promotionalVariantId || ""}><option value="" disabled>Select variant</option>{variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.product?.name || "Perfume"} · {variant.sku} · {Object.values(variant.options || {}).join(" / ")}</option>)}</select></label>
      <div className="admin-form-row"><label>Minimum cart total<input name="minimumSubtotal" type="number" min="0" step="0.01" defaultValue={editingPromotion?.minimumSubtotal ?? 0} /></label><label>Usage limit<input name="usageLimit" type="number" min="1" placeholder="Unlimited" defaultValue={editingPromotion?.usageLimit ?? ""} /></label></div>
      <div className="admin-modal-footer"><button type="button" className="admin-button admin-button-secondary" disabled={saving} onClick={() => { setModalOpen(false); setEditingPromotion(null); }}>Cancel</button><button className="admin-button admin-button-dark" disabled={saving}>{saving ? "Saving…" : editingPromotion ? "Save changes" : "Create promotion"}</button></div>
    </form></div>}
  </div>;
}
