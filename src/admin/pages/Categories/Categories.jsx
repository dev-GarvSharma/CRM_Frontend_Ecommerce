import { useEffect, useState } from "react";
import { FolderPlus, Pencil, Plus, X } from "lucide-react";
import {
  createCategory,
  getAllCategories,
  getCategoryDetails,
  updateCategory,
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
import { resolveImageUrl } from "../../../utils/image.js";

export default function Categories({ globalSearch = "", onNotify }) {
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [editingCategory, setEditingCategory] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [records, setRecords] = useState(20);
  const [imagePreview, setImagePreview] = useState("");
  const load = () => {
    setLoading(true);
    setFailed(false);
    getAllCategories(page, records)
      .then((result) => {
        if (result.success) setResponse(result);
        else setFailed(true);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    getAllCategories(page, records)
      .then((result) => {
        if (result.success) setResponse(result);
        else setFailed(true);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [page, records]);
  if (loading) return <LoadingState label="Loading product categories" />;
  if (failed) return <ErrorState retry={load} />;
  const allCategories = response?.data?.data || [];
  const categories = allCategories.filter((item) =>
    `${item.name} ${item.slug}`
      .toLowerCase()
      .includes((globalSearch.trim() || query).toLowerCase().trim()),
  );
  const closeModal = () => {
    setModalOpen(false);
    setEditingCategory(null);
    setImagePreview("");
  };
  const openEdit = async (item) => {
    const result = await getCategoryDetails(item.id);
    if (!result.success) {
      onNotify(result.message || "Could not load category details.");
      return;
    }
    setEditingCategory(result?.data?.data);
    setImagePreview(resolveImageUrl(result?.data?.data?.image));
    setModalOpen(true);
  };
  const saveCategory = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next = new FormData();
    ["name", "slug", "description"].forEach((key) =>
      next.set(key, String(form.get(key) || "")),
    );
    next.set("priority", String(Number(form.get("priority") || 0)));
    next.set("meta_title", String(form.get("metaTitle") || ""));
    next.set("meta_description", String(form.get("metaDescription") || ""));
    next.set("robots_meta_tag", String(form.get("robots") || "index, follow"));
    next.set("show_on_home_page", String(form.get("featured") === "on"));
    const imageFile = form.get("image");
    if (imageFile instanceof File && imageFile.size > 0)
      next.set("image", imageFile);
    setSaving(true);
    const result = editingCategory
      ? await updateCategory(editingCategory.id, next)
      : await createCategory(next);
    setSaving(false);
    if (!result.success) {
      onNotify(result.message || "Could not save category.");
      return;
    }
    await load();
    onNotify(editingCategory ? "Category updated." : "Category created.");
    closeModal();
  };
  return (
    <div className="admin-page-content">
      <PageHeading
        eyebrow="CATALOG STRUCTURE"
        title="Categories"
        description="Organize your catalog and control how collections appear in your store."
        action={
          <button
            className="admin-button admin-button-dark"
            onClick={() => {
              setEditingCategory(null);
              setImagePreview("");
              setModalOpen(true);
            }}
          >
            <Plus size={17} />
            Add category
          </button>
        }
      />
      <div className="admin-category-grid">
        {categories.map((category, index) => (
          <article className="admin-category-card" key={category.id}>
            <div className={`admin-category-art category-art-${index % 3}`}>
              {category.image ? (
                <img src={resolveImageUrl(category.image)} alt={`${category.name} category`} loading="lazy" />
              ) : (
                <FolderPlus size={22} />
              )}
              <span>{String(index + 1).padStart(2, "0")}</span>
            </div>
            <div className="admin-category-card-content">
              <div className="admin-category-title">
                <div>
                  <h2>{category.name}</h2>
                  <span>/{category.slug}</span>
                </div>
                <button
                  className="admin-icon-button"
                  aria-label={`Edit ${category.name}`}
                  title="Edit category"
                  onClick={() => openEdit(category)}
                >
                  <Pencil size={15} />
                </button>
              </div>
              <p>{category.description}</p>
              <div className="admin-category-meta">
                <span>
                  <strong>{category.products?.length || 0}</strong> products
                </span>
                <StatusPill>
                  {(category.showOnHomePage ?? category.show_on_home_page) ? "Featured" : "Hidden"}
                </StatusPill>
              </div>
            </div>
          </article>
        ))}
        {!categories.length && <EmptyState title="No categories found" />}
      </div>
      <div className="admin-list-toolbar admin-category-search">
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Search categories"
        />
        <span className="admin-muted-count">
          {categories.length} categories
        </span>
      </div>
      <section className="admin-panel admin-table-panel">
        <div className="admin-panel-heading">
          <div>
            <h2>Category settings</h2>
            <p>SEO and storefront visibility</p>
          </div>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>CATEGORY</th>
                <th>HOME PAGE</th>
                <th>PRIORITY</th>
                <th>META TITLE</th>
                <th>ROBOTS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.name}</strong>
                  </td>
                  <td>
                    <StatusPill>
                      {(item.showOnHomePage ?? item.show_on_home_page) ? "Visible" : "Hidden"}
                    </StatusPill>
                  </td>
                  <td>{item.priority}</td>
                  <td>{item.metaTitle || item.meta_title}</td>
                  <td className="admin-code">{item.robotsMetaTag || item.robots_meta_tag}</td>
                  <td>
                    <button
                      className="admin-icon-button table-more"
                      aria-label={`Edit ${item.name}`}
                      onClick={() => openEdit(item)}
                    >
                      <Pencil size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ListPagination meta={response?.data?.meta} page={page} records={records} onPageChange={setPage} onRecordsChange={(size) => { setPage(1); setRecords(size); }} label="categories" />
      </section>
      {modalOpen && (
        <div
          className="admin-modal-backdrop"
          role="presentation"
          onMouseDown={(event) =>
            event.target === event.currentTarget && closeModal()
          }
        >
          <form
            className="admin-modal admin-category-modal"
            onSubmit={saveCategory}
          >
            <div className="admin-modal-header">
              <div>
                <span className="admin-eyebrow">CATALOG STRUCTURE</span>
                <h2>{editingCategory ? "Edit category" : "Add category"}</h2>
              </div>
              <button
                type="button"
                className="admin-icon-button"
                aria-label="Close"
                onClick={closeModal}
              >
                <X size={18} />
              </button>
            </div>
            <label>
              Category name
              <input
                name="name"
                required
                defaultValue={editingCategory?.name || ""}
                placeholder="e.g. Herbal Infusions"
              />
            </label>
            <label>
              URL slug
              <input
                name="slug"
                required
                defaultValue={editingCategory?.slug || ""}
                placeholder="herbal-infusions"
              />
            </label>
            <label>
              Description
              <textarea
                name="description"
                rows="2"
                defaultValue={editingCategory?.description || ""}
                placeholder="Short collection description"
              />
            </label>
            <label className="admin-category-image-field">
              Category image{!editingCategory && " (required)"}
              <input
                name="image"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                required={!editingCategory}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) setImagePreview(URL.createObjectURL(file));
                  else setImagePreview(resolveImageUrl(editingCategory?.image));
                }}
              />
              {imagePreview && <img className="admin-category-image-preview" src={imagePreview} alt="Category preview" />}
              <small>JPG, PNG, WebP or AVIF. A square or landscape image works best.</small>
            </label>
            <div className="admin-form-row">
              <label>
                Priority
                <input
                  name="priority"
                  type="number"
                  min="0"
                  defaultValue={editingCategory?.priority ?? 1}
                />
              </label>
              <label>
                Robots meta
                <select
                  name="robots"
                  defaultValue={
                    editingCategory?.robotsMetaTag || editingCategory?.robots_meta_tag || "index,follow"
                  }
                >
                  <option>index, follow</option>
                  <option>noindex, follow</option>
                  <option>noindex, nofollow</option>
                </select>
              </label>
            </div>
            <label>
              Meta title
              <input
                name="metaTitle"
                defaultValue={editingCategory?.metaTitle || editingCategory?.meta_title || ""}
                placeholder="Search result title"
              />
            </label>
            <label>
              Meta description
              <textarea
                name="metaDescription"
                rows="2"
                defaultValue={editingCategory?.metaDescription || editingCategory?.meta_description || ""}
                placeholder="Search result description"
              />
            </label>
            <label className="admin-checkbox-label">
              <input
                type="checkbox"
                name="featured"
                defaultChecked={editingCategory?.showOnHomePage ?? editingCategory?.show_on_home_page ?? false}
              />
              Show on home page
            </label>
            <div className="admin-modal-footer">
              <button
                type="button"
                className="admin-button admin-button-secondary"
                onClick={closeModal}
              >
                Cancel
              </button>
              <button className="admin-button admin-button-dark" type="submit" disabled={saving}>
                {editingCategory ? <Pencil size={15} /> : <Plus size={16} />}
                {saving ? "Saving…" : editingCategory ? "Save changes" : "Create category"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
