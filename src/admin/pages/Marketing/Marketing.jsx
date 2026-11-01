import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { ArrowRight, Eye, Mail, MessageSquare, Pencil, Plus, Trash2, Users, X } from "lucide-react";
import "jodit/es2021/jodit.min.css";
import AdminPortal from "../../components/AdminPortal.jsx";
import { EmptyState, ErrorState, ListPagination, LoadingState, PageHeading, StatusPill } from "../../components/AdminPrimitives.jsx";
import {
  createCampaign,
  deleteCampaign,
  getCampaignDetails,
  getMarketingCampaigns,
  getMarketingOverview,
  getMarketingSubscribers,
  sendCampaign,
  updateCampaign,
} from "./api.js";

const JoditEditor = lazy(() => import("jodit-react"));
const statuses = ["Draft", "Scheduled", "Active", "Sending", "Sent", "Paused", "Failed"];
const editableStatuses = ["Draft", "Scheduled", "Active", "Paused"];
const toLocalDateTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};
const displayDate = (value) => value ? new Date(value).toLocaleString() : "—";

export default function Marketing({ globalSearch = "", onNotify }) {
  const [overview, setOverview] = useState({});
  const [campaigns, setCampaigns] = useState([]);
  const [campaignMeta, setCampaignMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [page, setPage] = useState(1);
  const [records, setRecords] = useState(10);
  const [statusFilter, setStatusFilter] = useState("All campaigns");
  const [search, setSearch] = useState(globalSearch.trim());
  const [campaignDialogOpen, setCampaignDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [formStatus, setFormStatus] = useState("Draft");
  const [formChannel, setFormChannel] = useState("email");
  const [contentDraft, setContentDraft] = useState("");
  const [previewContent, setPreviewContent] = useState(false);
  const [detailsCampaign, setDetailsCampaign] = useState(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [subscribersOpen, setSubscribersOpen] = useState(false);
  const [subscribers, setSubscribers] = useState([]);
  const [subscriberMeta, setSubscriberMeta] = useState(null);
  const [subscriberPage, setSubscriberPage] = useState(1);
  const [subscriberSearch, setSubscriberSearch] = useState("");
  const [subscribersLoading, setSubscribersLoading] = useState(false);
  const [subscriberFailed, setSubscriberFailed] = useState(false);
  const [subscriberAttempt, setSubscriberAttempt] = useState(0);
  const emailEditorConfig = useMemo(() => ({
    readonly: false,
    height: 360,
    minHeight: 280,
    toolbarAdaptive: false,
    buttons: [
      "bold", "italic", "underline", "strikethrough", "|",
      "ul", "ol", "|", "font", "fontsize", "brush", "paragraph", "|",
      "image", "link", "table", "|", "align", "undo", "redo", "hr", "source",
    ],
    uploader: { insertImageAsBase64URI: false, url: "" },
    placeholder: "Write your email campaign…",
  }), []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(globalSearch.trim());
      setPage(1);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [globalSearch]);

  const load = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setFailed(false);
    const [overviewResult, listResult] = await Promise.all([
      getMarketingOverview(),
      getMarketingCampaigns(page, records, search, statusFilter),
    ]);
    if (!overviewResult.success || !listResult.success) {
      setFailed(true);
      setLoading(false);
      return;
    }
    setOverview(overviewResult.data?.data || {});
    setCampaigns(listResult.data?.data || []);
    setCampaignMeta(listResult.data?.meta || null);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [page, records, statusFilter, search]);

  useEffect(() => {
    if (!subscribersOpen) return undefined;
    let current = true;
    const timer = window.setTimeout(async () => {
      setSubscribersLoading(true);
      setSubscriberFailed(false);
      const result = await getMarketingSubscribers(subscriberPage, 10, subscriberSearch.trim());
      if (current) {
        if (result.success) {
          setSubscribers(result.data?.data || []);
          setSubscriberMeta(result.data?.meta || null);
        } else {
          setSubscriberFailed(true);
        }
        setSubscribersLoading(false);
      }
    }, 200);
    return () => {
      current = false;
      window.clearTimeout(timer);
    };
  }, [subscribersOpen, subscriberPage, subscriberSearch, subscriberAttempt]);

  const openCreate = (channel = "email") => {
    setEditingCampaign({
      name: "",
      subject: "",
      channel,
      audience: "All customers",
      status: "Draft",
      scheduledAt: null,
      content: "",
    });
    setFormStatus("Draft");
    setFormChannel(channel);
    setContentDraft("");
    setPreviewContent(false);
    setCampaignDialogOpen(true);
  };

  const openEdit = async (campaign) => {
    const result = await getCampaignDetails(campaign.id);
    if (!result.success) return onNotify(result.message || "Could not load campaign.");
    setEditingCampaign(result.data?.data || campaign);
    setFormStatus(result.data?.data?.status || campaign.status || "Draft");
    setFormChannel(result.data?.data?.channel || campaign.channel || "email");
    setContentDraft(result.data?.data?.content || campaign.content || "");
    setPreviewContent(false);
    setCampaignDialogOpen(true);
  };

  const openDetails = async (campaign) => {
    const result = await getCampaignDetails(campaign.id);
    if (!result.success) return onNotify(result.message || "Could not load campaign details.");
    setDetailsCampaign(result.data?.data || campaign);
  };

  const save = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const status = String(form.get("status") || "Draft");
    const schedule = String(form.get("scheduledAt") || "");
    const values = {
      name: String(form.get("name") || "").trim(),
      subject: String(form.get("subject") || editingCampaign.subject || form.get("name") || "").trim(),
      channel: String(form.get("channel") || "email"),
      audience: String(form.get("audience") || "").trim(),
      status,
      scheduledAt: status === "Scheduled" && schedule ? new Date(schedule).toISOString() : null,
      content: contentDraft,
    };
    setSaving(true);
    const result = editingCampaign?.id
      ? await updateCampaign(editingCampaign.id, values)
      : await createCampaign(values);
    setSaving(false);
    if (!result.success) return onNotify(result.message || "Could not save campaign.");
    setCampaignDialogOpen(false);
    setEditingCampaign(null);
    onNotify(editingCampaign?.id ? "Campaign updated." : "Campaign created.");
    await load(false);
  };

  const updateStatus = async (campaign) => {
    const status = campaign.status === "Active" ? "Paused" : "Active";
    setBusyId(campaign.id);
    const result = await updateCampaign(campaign.id, { status, scheduledAt: null });
    setBusyId("");
    if (!result.success) return onNotify(result.message || "Could not update campaign.");
    onNotify("Campaign " + status.toLowerCase() + ".");
    await load(false);
  };

  const send = async (campaign) => {
    const subject = campaign.subject || campaign.name;
    if (!window.confirm(`Send “${campaign.name}” to ${overview.subscribers || 0} opted-in email subscribers now?\n\nSubject: ${subject}`)) return;
    setBusyId(campaign.id);
    const result = await sendCampaign(campaign.id);
    setBusyId("");
    if (!result.success) return onNotify(result.message || "Could not send campaign.");
    const delivery = result.data?.data || {};
    onNotify(`Campaign accepted by SendGrid: ${delivery.accepted || 0} email(s), ${delivery.skipped || 0} skipped, ${delivery.failed || 0} failed.`);
    await load(false);
  };

  const remove = async (campaign) => {
    if (!window.confirm("Delete campaign " + campaign.name + "?")) return;
    setBusyId(campaign.id);
    const result = await deleteCampaign(campaign.id);
    setBusyId("");
    if (!result.success) return onNotify(result.message || "Could not delete campaign.");
    onNotify("Campaign deleted.");
    await load(false);
  };

  const closeEditor = () => {
    setCampaignDialogOpen(false);
    setEditingCampaign(null);
    setContentDraft("");
    setPreviewContent(false);
  };

  if (loading) return <LoadingState label="Loading campaigns" />;
  if (failed) return <ErrorState retry={() => load()} />;

  const counts = overview.campaignStatuses || {};

  return (
    <div className="admin-page-content">
      <PageHeading
        eyebrow="CAMPAIGN MANAGEMENT"
        title="Campaigns"
        description="Create, schedule, and manage email and SMS campaign records."
        action={<button className="admin-button admin-button-dark" onClick={() => openCreate()}><Plus size={16} /> New campaign</button>}
      />
      <div className="admin-summary-strip">
        <div><span>Email subscribers</span><strong>{overview.subscribers || 0}</strong></div>
        <div><span>Active campaigns</span><strong>{counts.Active || 0}</strong></div>
        <div><span>Scheduled</span><strong>{counts.Scheduled || 0}</strong></div>
        <div><span>Drafts</span><strong>{counts.Draft || 0}</strong></div>
      </div>
      <section className="admin-panel admin-table-panel">
        <div className="admin-panel-heading admin-campaign-toolbar">
          <div><h2>Campaign list</h2><p>{overview.totalCampaigns || 0} campaigns</p></div>
          <div className="admin-campaign-toolbar-actions">
            <label className="admin-campaign-status-filter">Status
              <select value={statusFilter} onChange={(event) => { setPage(1); setStatusFilter(event.target.value); }}>
                <option>All campaigns</option>
                {statuses.map((status) => <option key={status}>{status}</option>)}
              </select>
            </label>
            <button className="admin-button admin-button-secondary" onClick={() => setSubscribersOpen(true)}><Users size={15} /> Subscribers</button>
          </div>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table admin-campaign-table">
            <thead><tr><th>CAMPAIGN</th><th>CHANNEL</th><th>AUDIENCE</th><th>STATUS</th><th>SCHEDULE</th><th>UPDATED</th><th>ACTIONS</th></tr></thead>
            <tbody>
              {campaigns.map((campaign) => (
                <tr key={campaign.id}>
                  <td><strong>{campaign.name}</strong></td>
                  <td>{campaign.channel === "sms" ? "SMS" : "Email"}</td>
                  <td>{campaign.audience}</td>
                  <td><StatusPill>{campaign.status}</StatusPill></td>
                  <td>{campaign.scheduledAt ? new Date(campaign.scheduledAt).toLocaleString() : "—"}</td>
                  <td>{campaign.updatedAt ? new Date(campaign.updatedAt).toLocaleDateString() : "—"}</td>
                  <td><div className="admin-campaign-row-actions">
                    <button className="admin-icon-button" title="View details" aria-label={"View " + campaign.name} onClick={() => openDetails(campaign)}><Eye size={15} /></button>
                    {["Draft", "Scheduled", "Active", "Paused"].includes(campaign.status) && <button className="admin-icon-button" title="Edit campaign" aria-label={"Edit " + campaign.name} onClick={() => openEdit(campaign)}><Pencil size={15} /></button>}
                    {["Draft", "Scheduled", "Active", "Paused"].includes(campaign.status) && <button className="admin-button admin-button-secondary" disabled={busyId === campaign.id} onClick={() => updateStatus(campaign)}>{busyId === campaign.id ? "Updating…" : campaign.status === "Active" ? "Pause" : "Activate"}</button>}
                    {campaign.channel === "email" && ["Draft", "Scheduled", "Active", "Paused"].includes(campaign.status) && <button className="admin-button admin-button-dark" disabled={busyId === campaign.id} onClick={() => send(campaign)}>{busyId === campaign.id ? "Sending…" : "Send"}</button>}
                    {["Draft", "Paused"].includes(campaign.status) && <button className="admin-icon-button admin-campaign-delete" title="Delete campaign" aria-label={"Delete " + campaign.name} disabled={busyId === campaign.id} onClick={() => remove(campaign)}><Trash2 size={15} /></button>}
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!campaigns.length && <EmptyState title="No campaigns found" detail="Create a campaign or adjust the search and status filters." />}
        </div>
        <ListPagination meta={campaignMeta} page={page} records={records} onPageChange={setPage} onRecordsChange={(size) => { setPage(1); setRecords(size); }} label="campaigns" />
      </section>
      <div className="admin-marketing-shortcuts">
        <button onClick={() => openCreate("email")}><span><Mail size={18} /></span><strong>Email campaign</strong><small>Create an email campaign.</small><ArrowRight size={16} /></button>
        <button onClick={() => openCreate("sms")}><span><MessageSquare size={18} /></span><strong>SMS campaign</strong><small>Create a mobile message campaign.</small><ArrowRight size={16} /></button>
        <button onClick={() => setSubscribersOpen(true)}><span><Users size={18} /></span><strong>Email subscribers</strong><small>Review customers who opted in.</small><ArrowRight size={16} /></button>
      </div>

      {campaignDialogOpen && editingCampaign && <AdminPortal>
        <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeEditor()}>
          <form className="admin-modal admin-campaign-modal" onSubmit={save}>
            <div className="admin-modal-header"><div><span className="admin-eyebrow">CAMPAIGN WORKSPACE</span><h2>{editingCampaign.id ? "Edit campaign" : "Create campaign"}</h2></div><button type="button" className="admin-icon-button" aria-label="Close" onClick={closeEditor}><X size={18} /></button></div>
            <label>Campaign name<input name="name" required minLength={2} maxLength={180} defaultValue={editingCampaign.name} placeholder="New signature scent launch" /></label>
            {formChannel !== "sms" && <label>Email subject<input name="subject" required maxLength={200} defaultValue={editingCampaign.subject || editingCampaign.name} placeholder="Discover your next signature scent" /></label>}
            <div className="admin-form-row">
              <label>Channel<select name="channel" value={formChannel} onChange={(event) => setFormChannel(event.target.value)}><option value="email">Email</option><option value="sms">SMS</option></select></label>
              <label>Status<select name="status" value={formStatus} onChange={(event) => setFormStatus(event.target.value)}>{editableStatuses.map((status) => <option key={status}>{status}</option>)}</select></label>
            </div>
            <label>Audience<input name="audience" required maxLength={120} defaultValue={editingCampaign.audience || "All customers"} placeholder="All customers" /><small>Describe which customers this campaign is intended for.</small></label>
            <label>Schedule date and time<input name="scheduledAt" type="datetime-local" required={formStatus === "Scheduled"} defaultValue={toLocalDateTime(editingCampaign.scheduledAt)} /><small>A future date is required for Scheduled campaigns.</small></label>
            <div className="admin-campaign-editor-heading"><div><strong>{formChannel === "sms" ? "SMS message" : "Email content"}</strong><small>{formChannel === "sms" ? "Write the text message content." : "Format the email and use the toolbar to add images and links."}</small></div>{formChannel !== "sms" && <button type="button" className="admin-button admin-button-secondary" onClick={() => setPreviewContent((value) => !value)}>{previewContent ? "Back to editor" : "Preview email"}</button>}</div>
            {previewContent && formChannel !== "sms" ? <iframe className="admin-email-preview" title="Email campaign preview" sandbox="" referrerPolicy="no-referrer" srcDoc={contentDraft || "<div style='font-family:Arial,sans-serif;padding:32px;color:#555'>Your email preview will appear here.</div>"} /> : formChannel === "sms" ? <textarea name="content" rows={5} maxLength={50000} value={contentDraft} onChange={(event) => setContentDraft(event.target.value)} placeholder="Write the SMS message." /> : <div className="admin-campaign-jodit"><Suspense fallback={<div className="admin-editor-loading">Loading email editor…</div>}><JoditEditor value={contentDraft} config={emailEditorConfig} onChange={(html) => setContentDraft(html)} /></Suspense></div>}
            <small>{formChannel === "sms" ? "SMS content is saved as text." : "Images should use public HTTPS addresses so recipients can load them."} {contentDraft.length.toLocaleString()} / 50,000 characters.</small>
            <div className="admin-modal-footer"><button type="button" className="admin-button admin-button-secondary" onClick={closeEditor}>Cancel</button><button className="admin-button admin-button-dark" disabled={saving}>{saving ? "Saving…" : editingCampaign.id ? "Save changes" : "Create campaign"}</button></div>
          </form>
        </div>
      </AdminPortal>}

      {detailsCampaign && <AdminPortal>
        <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setDetailsCampaign(null)}>
          <section className="admin-modal admin-campaign-modal">
            <div className="admin-modal-header"><div><span className="admin-eyebrow">CAMPAIGN DETAILS</span><h2>{detailsCampaign.name}</h2></div><button type="button" className="admin-icon-button" aria-label="Close" onClick={() => setDetailsCampaign(null)}><X size={18} /></button></div>
            <div className="admin-campaign-detail-grid">
              <div><small>Channel</small><strong>{detailsCampaign.channel === "sms" ? "SMS" : "Email"}</strong></div>
              {detailsCampaign.channel !== "sms" && <div><small>Email subject</small><strong>{detailsCampaign.subject || detailsCampaign.name}</strong></div>}
              <div><small>Status</small><StatusPill>{detailsCampaign.status}</StatusPill></div>
              <div><small>Audience</small><strong>{detailsCampaign.audience || "—"}</strong></div>
              <div><small>Scheduled</small><strong>{displayDate(detailsCampaign.scheduledAt)}</strong></div>
              <div><small>Created</small><strong>{displayDate(detailsCampaign.createdAt)}</strong></div>
              <div><small>Updated</small><strong>{displayDate(detailsCampaign.updatedAt)}</strong></div>
              {detailsCampaign.deliverySummary && <div><small>SendGrid result</small><strong>{detailsCampaign.deliverySummary.accepted} accepted · {detailsCampaign.deliverySummary.skipped} skipped · {detailsCampaign.deliverySummary.failed} failed</strong></div>}
            </div>
            <section className="admin-campaign-content"><h3>{detailsCampaign.channel === "sms" ? "SMS message" : "Email preview"}</h3>{detailsCampaign.channel === "sms" ? <p>{detailsCampaign.content || "No content added."}</p> : <iframe className="admin-email-preview" title="Email campaign preview" sandbox="" referrerPolicy="no-referrer" srcDoc={detailsCampaign.content || "<div style='font-family:Arial,sans-serif;padding:32px;color:#555'>No email content added.</div>"} />}</section>
            <div className="admin-modal-footer"><button className="admin-button admin-button-secondary" onClick={() => setDetailsCampaign(null)}>Close</button>{["Draft", "Scheduled", "Active", "Paused"].includes(detailsCampaign.status) && <button className="admin-button admin-button-dark" onClick={() => { setDetailsCampaign(null); openEdit(detailsCampaign); }}>Edit campaign</button>}</div>
          </section>
        </div>
      </AdminPortal>}

      {subscribersOpen && <AdminPortal>
        <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setSubscribersOpen(false)}>
          <section className="admin-modal admin-subscribers-modal">
            <div className="admin-modal-header"><div><span className="admin-eyebrow">CAMPAIGN AUDIENCE</span><h2>Email subscribers</h2><p>Only active, mobile-verified customers who opted in are listed and eligible to receive campaign email.</p></div><button type="button" className="admin-icon-button" aria-label="Close" onClick={() => setSubscribersOpen(false)}><X size={18} /></button></div>
            <label className="admin-search"><Users size={15} /><input type="search" value={subscriberSearch} onChange={(event) => setSubscriberSearch(event.target.value)} placeholder="Search subscriber name or email" /></label>
            {subscribersLoading ? <LoadingState label="Loading customers" /> : subscriberFailed ? <ErrorState retry={() => setSubscriberAttempt((value) => value + 1)} /> : <>
              <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>CUSTOMER</th><th>EMAIL</th><th>SUBSCRIBED</th><th>CONSENT</th></tr></thead><tbody>
                {subscribers.map((subscriber) => <tr key={subscriber.id}><td><strong>{subscriber.name}</strong></td><td>{subscriber.email || "—"}</td><td>{subscriber.marketingEmailSubscribedAt ? new Date(subscriber.marketingEmailSubscribedAt).toLocaleDateString() : "—"}</td><td><StatusPill>Opted in</StatusPill></td></tr>)}
              </tbody></table>{!subscribers.length && <EmptyState title="No customers found" detail="Try a different search." />}</div>
              <ListPagination meta={subscriberMeta} page={subscriberPage} records={10} onPageChange={setSubscriberPage} onRecordsChange={() => {}} label="customers" />
            </>}
            <div className="admin-modal-footer"><button type="button" className="admin-button admin-button-secondary" onClick={() => setSubscribersOpen(false)}>Close</button></div>
          </section>
        </div>
      </AdminPortal>}
    </div>
  );
}
