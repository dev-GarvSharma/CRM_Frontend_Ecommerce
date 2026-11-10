import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  Bell,
  CreditCard,
  Globe2,
  LockKeyhole,
  Save,
  Store,
} from "lucide-react";
import { getStoreSettings, saveStoreSettings } from "./api.js";
import LocalStorageService from "../../services/localStorageService.js";
import {
  getRazorpayMode,
  getRazorpayTestOrders,
  setRazorpayMode,
} from "../Products/api.js";
import {
  ErrorState,
  LoadingState,
  ListPagination,
  PageHeading,
} from "../../components/AdminPrimitives.jsx";

const sections = [
  { key: "general", name: "General", icon: Store },
  { key: "notifications", name: "Notifications", icon: Bell },
  { key: "checkout", name: "Checkout", icon: CreditCard },
  { key: "payments", name: "Razorpay", icon: CreditCard },
  { key: "regional", name: "Regional", icon: Globe2 },
  { key: "security", name: "Security", icon: LockKeyhole },
];

export default function Settings({ onNotify }) {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [activeSection, setActiveSection] = useState("general");
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [razorpayConfig, setRazorpayConfig] = useState(null);
  const [testOrders, setTestOrders] = useState([]);
  const [testOrderMeta, setTestOrderMeta] = useState(null);
  const [testOrderPage, setTestOrderPage] = useState(1);
  const [testOrderRecords, setTestOrderRecords] = useState(20);
  const [razorpaySaving, setRazorpaySaving] = useState(false);
  const user = LocalStorageService.getUserData();
  const load = () => {
    setLoading(true);
    setFailed(false);
    getStoreSettings()
      .then((result) => {
        if (result.success) setForm(result.data?.data || {});
        else setFailed(true);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    getStoreSettings()
      .then((result) => {
        if (result.success) setForm(result.data?.data || {});
        else setFailed(true);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    getRazorpayMode().then((result) =>
      setRazorpayConfig(result.data?.data || null),
    );
  }, []);
  useEffect(() => {
    getRazorpayTestOrders(testOrderPage, testOrderRecords).then((result) => {
      setTestOrders(result.data?.data || []);
      setTestOrderMeta(result.data?.meta || null);
    });
  }, [testOrderPage, testOrderRecords]);
  useEffect(() => {
    const section = new URLSearchParams(location.search).get("section");
    if (sections.some((item) => item.key === section))
      setActiveSection(section);
  }, [location.search]);
  const update = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));
  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    const result = await saveStoreSettings(form);
    setSaving(false);
    onNotify(
      result.message ||
        (result.success ? "Settings saved." : "Could not save settings."),
    );
  };
  const changeRazorpayMode = async (mode) => {
    setRazorpaySaving(true);
    const result = await setRazorpayMode(mode);
    setRazorpaySaving(false);
    if (!result.success)
      return onNotify(result.message || "Could not change Razorpay mode.");
    setRazorpayConfig(result.data?.data || null);
    onNotify(`Razorpay ${mode} mode enabled.`);
  };
  if (loading) return <LoadingState label="Loading store settings" />;
  if (failed) return <ErrorState retry={load} />;

  return (
    <div className="admin-page-content">
      <PageHeading
        eyebrow="YOUR STORE"
        title="Settings"
        description="Configure how your store operates behind the scenes."
        action={
          activeSection === "payments" ? null : (
            <button
              className="admin-button admin-button-dark"
              form="admin-settings-form"
              type="submit"
              disabled={saving}
            >
              <Save size={16} />
              {saving ? "Saving…" : "Save changes"}
            </button>
          )
        }
      />
      <div className="admin-settings-layout">
        <nav className="admin-settings-nav">
          {sections.map(({ key, name, icon: Icon }) => (
            <button
              key={key}
              className={activeSection === key ? "is-active" : ""}
              onClick={() => setActiveSection(key)}
            >
              <Icon size={17} />
              {name}
            </button>
          ))}
        </nav>
        <form
          id="admin-settings-form"
          className="admin-settings-form"
          onSubmit={save}
        >
          {activeSection === "general" && (
            <section className="admin-panel admin-settings-panel">
              <div className="admin-panel-heading">
                <div>
                  <h2>Store details</h2>
                  <p>
                    These details are used across your storefront and customer
                    emails.
                  </p>
                </div>
              </div>
              <label className="admin-form-label">
                Store name
                <input
                  value={form.storeName || ""}
                  onChange={(event) => update("storeName", event.target.value)}
                />
              </label>
              <label className="admin-form-label">
                Store contact email
                <input
                  type="email"
                  value={form.supportEmail || ""}
                  onChange={(event) =>
                    update("supportEmail", event.target.value)
                  }
                />
              </label>
              <label className="admin-form-label">
                Store description
                <textarea
                  rows="3"
                  value={form.description || ""}
                  onChange={(event) =>
                    update("description", event.target.value)
                  }
                />
              </label>
              <div className="admin-settings-divider" />
              <h3>Store status</h3>
              <div className="admin-setting-toggle-row">
                <div>
                  <strong>Online store</strong>
                  <span>Your storefront is available to customers.</span>
                </div>
                <button
                  className={`admin-toggle ${form.onlineStore === false ? "" : "is-on"}`}
                  type="button"
                  aria-label="Toggle online store"
                  onClick={() =>
                    update("onlineStore", form.onlineStore === false)
                  }
                >
                  <i />
                </button>
              </div>
            </section>
          )}
          {activeSection === "notifications" && (
            <section className="admin-panel admin-settings-panel">
              <div className="admin-panel-heading">
                <div>
                  <h2>Notifications</h2>
                  <p>Choose which store events should reach your team.</p>
                </div>
              </div>
              {[
                [
                  "orderNotifications",
                  "New order alerts",
                  "Get notified when a customer places an order.",
                ],
                [
                  "emailNotifications",
                  "Email updates",
                  "Receive a daily summary of store activity.",
                ],
                [
                  "lowStockNotifications",
                  "Low stock alerts",
                  "Get notified when a product needs restocking.",
                ],
              ].map(([key, title, description]) => (
                <div className="admin-setting-toggle-row" key={key}>
                  <div>
                    <strong>{title}</strong>
                    <span>{description}</span>
                  </div>
                  <button
                    className={`admin-toggle ${form[key] !== false ? "is-on" : ""}`}
                    type="button"
                    aria-label={`${title} toggle`}
                    onClick={() => update(key, form[key] === false)}
                  >
                    <i />
                  </button>
                </div>
              ))}
            </section>
          )}
          {activeSection === "checkout" && (
            <section className="admin-panel admin-settings-panel">
              <div className="admin-panel-heading">
                <div>
                  <h2>Checkout preferences</h2>
                  <p>Set the defaults for customer checkout.</p>
                </div>
              </div>
              <div className="admin-setting-toggle-row">
                <div>
                  <strong>Guest checkout</strong>
                  <span>
                    Allow customers to place an order without an account.
                  </span>
                </div>
                <button
                  className={`admin-toggle ${form.guestCheckout === true ? "is-on" : ""}`}
                  type="button"
                  aria-label="Toggle guest checkout"
                  onClick={() =>
                    update("guestCheckout", form.guestCheckout !== true)
                  }
                >
                  <i />
                </button>
              </div>
              <div className="admin-setting-toggle-row">
                <div>
                  <strong>Require phone number</strong>
                  <span>Collect a phone number with every order.</span>
                </div>
                <button
                  className={`admin-toggle ${form.requirePhone !== false ? "is-on" : ""}`}
                  type="button"
                  aria-label="Toggle phone number requirement"
                  onClick={() =>
                    update("requirePhone", form.requirePhone === false)
                  }
                >
                  <i />
                </button>
              </div>
              <label className="admin-form-label">
                Default payment terms
                <select
                  value={form.paymentTerms || "Due on receipt"}
                  onChange={(event) =>
                    update("paymentTerms", event.target.value)
                  }
                >
                  <option>Due on receipt</option>
                  <option>Net 7 days</option>
                  <option>Net 30 days</option>
                </select>
              </label>
            </section>
          )}
          {activeSection === "payments" && (
            <section className="admin-panel admin-settings-panel">
              <div className="admin-panel-heading">
                <div>
                  <h2>Razorpay checkout mode</h2>
                  <p>
                    New online orders use the selected credentials. Existing
                    orders keep their original mode.
                  </p>
                </div>
              </div>
              <div className="admin-razorpay-current">
                <span>ACTIVE CHECKOUT MODE</span>
                <strong>
                  {razorpayConfig?.mode === "test"
                    ? "Test mode"
                    : razorpayConfig?.mode === "live"
                      ? "Live mode"
                      : "Loading…"}
                </strong>
                <small>New online orders will use this credential set.</small>
              </div>
              <div className="admin-razorpay-mode-options">
                {[
                  {
                    mode: "test",
                    title: "Test mode",
                    description:
                      "Use Razorpay test credentials for simulated payments.",
                    configured: razorpayConfig?.testConfigured,
                  },
                  {
                    mode: "live",
                    title: "Live mode",
                    description:
                      "Accept real customer payments with live credentials.",
                    configured: razorpayConfig?.liveConfigured,
                  },
                ].map(({ mode, title, description, configured }) => (
                  <article
                    className={`admin-razorpay-option ${razorpayConfig?.mode === mode ? "is-active" : ""}`}
                    key={mode}
                  >
                    <div className="admin-razorpay-option-top">
                      <strong>{title}</strong>
                      <span
                        className={configured ? "is-configured" : "is-missing"}
                      >
                        {configured ? "Configured" : "Credentials missing"}
                      </span>
                    </div>
                    <p>{description}</p>
                    <button
                      type="button"
                      className={
                        razorpayConfig?.mode === mode
                          ? "admin-button admin-button-secondary"
                          : "admin-button admin-button-dark"
                      }
                      disabled={
                        razorpaySaving ||
                        !configured ||
                        razorpayConfig?.mode === mode
                      }
                      onClick={() => changeRazorpayMode(mode)}
                    >
                      {razorpayConfig?.mode === mode
                        ? "Currently active"
                        : `Enable ${mode} mode`}
                    </button>
                  </article>
                ))}
              </div>
              <div className="admin-settings-divider" />
              <div className="admin-razorpay-orders-heading">
                <div>
                  <h3>Test orders</h3>
                  <p>Orders created while test mode was active.</p>
                </div>
                <span>{testOrderMeta?.totalRecords ?? 0} total</span>
              </div>
              <div className="admin-table-wrap admin-razorpay-orders">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>ORDER</th>
                      <th>DATE</th>
                      <th>PAYMENT</th>
                      <th>TOTAL</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {testOrders.map((order) => (
                      <tr key={order.uuid}>
                        <td>{order.id}</td>
                        <td>
                          {order.date
                            ? new Date(order.date).toLocaleDateString()
                            : "—"}
                        </td>
                        <td>{order.payment}</td>
                        <td>₹{Number(order.total).toLocaleString("en-IN")}</td>
                        <td>{order.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!testOrders.length && <p>No test orders yet.</p>}
              </div>
              <ListPagination
                meta={testOrderMeta}
                page={testOrderPage}
                records={testOrderRecords}
                onPageChange={setTestOrderPage}
                onRecordsChange={(value) => {
                  setTestOrderPage(1);
                  setTestOrderRecords(value);
                }}
                label="test orders"
              />
            </section>
          )}
          {activeSection === "regional" && (
            <section className="admin-panel admin-settings-panel">
              <div className="admin-panel-heading">
                <div>
                  <h2>Regional preferences</h2>
                  <p>Manage the formats used in your admin and storefront.</p>
                </div>
              </div>
              <label className="admin-form-label">
                Store currency
                <select
                  value={form.currency || "INR"}
                  onChange={(event) => update("currency", event.target.value)}
                >
                  <option value="INR">Indian rupee (INR ₹)</option>
                  <option value="USD">US dollar (USD $)</option>
                  <option value="GBP">Pound sterling (GBP £)</option>
                </select>
              </label>
              <label className="admin-form-label">
                Timezone
                <select
                  value={form.timezone || "Asia/Kolkata"}
                  onChange={(event) => update("timezone", event.target.value)}
                >
                  <option value="Asia/Kolkata">
                    India Standard Time (IST)
                  </option>
                  <option value="UTC">Coordinated Universal Time (UTC)</option>
                  <option value="Asia/Dubai">Gulf Standard Time (GST)</option>
                </select>
              </label>
              <label className="admin-form-label">
                Low stock threshold
                <input
                  type="number"
                  min="0"
                  value={form.lowStockThreshold ?? 10}
                  onChange={(event) =>
                    update("lowStockThreshold", Number(event.target.value))
                  }
                />
                <small>
                  Products at or below this level appear in inventory alerts.
                </small>
              </label>
            </section>
          )}
          {activeSection === "security" && (
            <section className="admin-panel admin-settings-panel">
              <div className="admin-panel-heading">
                <div>
                  <h2>Account security</h2>
                  <p>Manage access to this store admin.</p>
                </div>
              </div>
              <div className="admin-security-card">
                <div className="admin-avatar admin-avatar-green">
                  {user?.name
                    ?.split(" ")
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase() || "AD"}
                </div>
                <div>
                  <strong>{user?.name || "Administrator"}</strong>
                  <span>
                    {user?.phone ||
                      user?.email ||
                      "Verified administrator account"}
                  </span>
                </div>
                <span className="admin-security-badge">
                  {user?.primaryRole || user?.role || "Admin"}
                </span>
              </div>
              <div className="admin-setting-toggle-row">
                <div>
                  <strong>Two-step verification</strong>
                  <span>Add another layer of security to admin sign-in.</span>
                </div>
                <button
                  className="admin-toggle"
                  type="button"
                  aria-label="Two-step verification is off"
                >
                  <i />
                </button>
              </div>
              <p>
                Administrator sign-in uses a one-time code sent to the verified
                mobile number.
              </p>
            </section>
          )}
        </form>
      </div>
      <div className="admin-page-footnote">
        <span>Settings are saved to the store database.</span>
        <span>Version 1.0.0</span>
      </div>
    </div>
  );
}
