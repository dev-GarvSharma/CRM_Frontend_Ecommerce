import { useEffect, useMemo, useState } from "react";
import JoditEditor from "jodit-react";
import { X } from "lucide-react";
import { EmptyState, ErrorState, LoadingState, PageHeading } from "../components/AdminPrimitives.jsx";
import { createBlogPost, deleteBlogPost, getBlogComments, getBlogPost, getBlogPosts, moderateBlogComment, updateBlogPost } from "./blogApi.js";
import { resolveImageUrl } from "../../utils/image.js";

const slugify = (value) => String(value || "")
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "");

const blankPost = {
  title: "",
  slug: "",
  description: "",
  content: "",
  metaTitle: "",
  metaDescription: "",
  metaTags: "",
  status: "draft",
};

export default function Blogs({ globalSearch = "", onNotify }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [previewPost, setPreviewPost] = useState(null);
  const [commentsPost, setCommentsPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(blankPost);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [banner, setBanner] = useState(null);
  const [currentBanner, setCurrentBanner] = useState("");
  const [bannerPreview, setBannerPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [moderatingId, setModeratingId] = useState(null);

  const load = async () => {
    setLoading(true);
    const result = await getBlogPosts();
    setFailed(!result.success);
    if (result.success) setPosts(result.data?.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  const term = globalSearch.trim().toLowerCase();
  const visiblePosts = useMemo(() => posts.filter((post) =>
    `${post.title} ${post.slug} ${post.description}`.toLowerCase().includes(term),
  ), [posts, term]);
  const editorConfig = useMemo(() => ({
    readonly: false,
    height: 360,
    toolbarAdaptive: false,
    buttons: "bold,italic,underline,strikethrough,|,ul,ol,|,paragraph,|,left,center,right,|,link,image,table,hr,|,undo,redo,|,source",
    askBeforePasteHTML: false,
    askBeforePasteFromWord: false,
    uploader: { insertImageAsBase64URI: false, url: "" },
  }), []);

  const openCreate = () => {
    setEditingId(null);
    setForm(blankPost);
    setSlugManuallyEdited(false);
    setBanner(null);
    setCurrentBanner("");
    setBannerPreview("");
    setEditorOpen(true);
  };

  const openEdit = async (post) => {
    const result = await getBlogPost(post.id);
    if (!result.success) return onNotify?.(result.message || "Could not load blog post.");
    const record = result.data?.data;
    setEditingId(post.id);
    setSlugManuallyEdited(true);
    setForm({
      title: record.title || "",
      slug: record.slug || "",
      description: record.description || "",
      content: record.content || "",
      metaTitle: record.metaTitle || "",
      metaDescription: record.metaDescription || "",
      metaTags: Array.isArray(record.metaTags) ? record.metaTags.join(", ") : "",
      status: record.status || "draft",
    });
    setBanner(null);
    setCurrentBanner(record.bannerImage || "");
    setBannerPreview(record.bannerImage ? resolveImageUrl(record.bannerImage) : "");
    setEditorOpen(true);
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    const data = new FormData(event.currentTarget);
    data.set("content", form.content);
    if (banner) data.set("bannerImage", banner);
    else data.delete("bannerImage");
    const result = editingId ? await updateBlogPost(editingId, data) : await createBlogPost(data);
    if (result.success) {
      setEditorOpen(false);
      await load();
    }
    onNotify?.(result.message || (result.success ? "Blog post saved." : "Could not save blog post."));
    setSaving(false);
  };

  const removePost = async (post) => {
    if (!window.confirm(`Delete “${post.title}” and its comments?`)) return;
    setDeletingId(post.id);
    const result = await deleteBlogPost(post.id);
    if (result.success) await load();
    onNotify?.(result.message || (result.success ? "Blog post deleted." : "Could not delete blog post."));
    setDeletingId(null);
  };

  const openDetails = async (post) => {
    setPreviewPost(post);
    const result = await getBlogPost(post.id);
    if (result.success) setPreviewPost(result.data?.data || post);
    else onNotify?.(result.message || "Could not load blog details.");
  };

  const openComments = async (post) => {
    setCommentsPost(post);
    setComments([]);
    setCommentsLoading(true);
    const result = await getBlogComments(post.id);
    if (result.success) setComments(result.data?.data || []);
    else onNotify?.(result.message || "Could not load comments for this blog post.");
    setCommentsLoading(false);
  };

  const moderateComment = async (comment, status) => {
    setModeratingId(comment.id);
    const result = await moderateBlogComment(comment.id, status);
    if (result.success)
      setComments((current) => current.map((item) => item.id === comment.id ? { ...item, status } : item));
    onNotify?.(result.message || (result.success ? "Comment updated." : "Could not update comment."));
    setModeratingId(null);
  };

  if (loading) return <LoadingState label="Loading blog posts" />;
  if (failed) return <ErrorState retry={load} />;

  return (
    <div className="admin-page-content">
      <PageHeading eyebrow="PUBLISHING" title="Blog" description="Write, optimize, publish, and manage storefront blog posts." action={<button className="admin-button admin-button-dark" onClick={openCreate}>New blog post</button>} />
      <section className="admin-panel admin-table-panel">
        <div className="admin-panel-heading"><div><h2>Blog posts</h2><p>{visiblePosts.length} posts</p></div></div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>BANNER</th><th>TITLE</th><th>STATUS</th><th>UPDATED</th><th>ACTIONS</th></tr></thead>
            <tbody>{visiblePosts.map((post) => <tr key={post.id}>
              <td>{post.bannerImage ? <img src={resolveImageUrl(post.bannerImage)} alt="" className="blog-admin-thumb" /> : "—"}</td>
              <td><strong>{post.title}</strong><br /><small>/{post.slug}</small></td>
              <td>{post.status}</td>
              <td>{new Date(post.updatedAt).toLocaleDateString()}</td>
              <td className="blog-admin-actions">
                <button className="admin-button admin-button-secondary" onClick={() => openEdit(post)}>Edit</button>
                <button className="admin-button admin-button-secondary" disabled={deletingId === post.id} onClick={() => removePost(post)}>{deletingId === post.id ? "Deleting…" : "Delete"}</button>
                <button className="admin-button admin-button-dark" onClick={() => openDetails(post)}>Details</button>
                <button className="admin-button admin-button-secondary" onClick={() => openComments(post)}>Comments</button>
              </td>
            </tr>)}</tbody>
          </table>
          {!visiblePosts.length && <EmptyState title="No matching blog posts" />}
        </div>
      </section>

      {editorOpen && <div className="admin-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditorOpen(false); }}>
        <form className="admin-modal blog-editor-modal" onSubmit={save}>
          <div className="admin-modal-header"><div><small>{editingId ? "EDIT POST" : "NEW POST"}</small><h2>{editingId ? "Edit blog post" : "Create blog post"}</h2></div><button type="button" className="admin-button" onClick={() => setEditorOpen(false)}>Close</button></div>
          <section className="blog-banner-editor">
            <div className="blog-banner-editor-heading">
              <div><strong>Banner image</strong><small>Choose an image for the top of this blog post.</small></div>
              <label className="admin-button admin-button-secondary blog-banner-choose">{bannerPreview ? "Change image" : "Add banner image"}<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(event) => {
                const file = event.target.files?.[0] || null;
                setBanner(file);
                setBannerPreview(file ? URL.createObjectURL(file) : (currentBanner ? resolveImageUrl(currentBanner) : ""));
              }} /></label>
            </div>
            {bannerPreview ? <img className="blog-banner-preview" src={bannerPreview} alt="Blog banner preview" /> : <div className="blog-banner-empty">Banner image preview will appear here</div>}
            {editingId && currentBanner && !banner && <small className="blog-banner-note">Leave the current image in place to keep it.</small>}
          </section>
          <div className="blog-editor-grid">
            <label className="admin-form-label">Title<input name="title" value={form.title} maxLength={200} required onChange={(event) => {
              const title = event.target.value;
              setForm((current) => ({ ...current, title, slug: slugManuallyEdited ? current.slug : slugify(title) }));
            }} /></label>
            <label className="admin-form-label">Slug<input name="slug" value={form.slug} placeholder="generated from title" maxLength={220} onChange={(event) => {
              setSlugManuallyEdited(true);
              setForm((current) => ({ ...current, slug: event.target.value }));
            }} /></label>
            <label className="admin-form-label blog-editor-wide">Short description<textarea name="description" value={form.description} maxLength={500} required onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
            <label className="admin-form-label">Meta title<input name="metaTitle" value={form.metaTitle} maxLength={200} onChange={(event) => setForm({ ...form, metaTitle: event.target.value })} /></label>
            <label className="admin-form-label">Meta tags / keywords<input name="metaTags" value={form.metaTags} placeholder="jewellery, styling, trends" onChange={(event) => setForm({ ...form, metaTags: event.target.value })} /></label>
            <label className="admin-form-label blog-editor-wide">Meta description<textarea name="metaDescription" value={form.metaDescription} maxLength={320} onChange={(event) => setForm({ ...form, metaDescription: event.target.value })} /></label>
            <label className="admin-form-label">Visibility<select name="status" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="draft">Draft</option><option value="published">Published</option></select></label>
            <div className="blog-editor-wide"><label className="admin-form-label">Blog content</label><JoditEditor value={form.content} config={editorConfig} onChange={(content) => setForm((current) => ({ ...current, content }))} /></div>
          </div>
          <div className="admin-modal-footer"><button type="button" className="admin-button" onClick={() => setEditorOpen(false)}>Cancel</button><button className="admin-button admin-button-dark" disabled={saving}>{saving ? "Saving…" : "Save post"}</button></div>
        </form>
      </div>}

      {previewPost && <div className="admin-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setPreviewPost(null); }}>
        <section className="admin-modal blog-details-modal">
          <div className="admin-modal-header">
            <div><span className="admin-eyebrow">BLOG DETAILS</span><h2>{previewPost.title}</h2><p>/{previewPost.slug}</p></div>
            <button type="button" className="admin-icon-button" onClick={() => setPreviewPost(null)} aria-label="Close details"><X size={18} /></button>
          </div>
          {previewPost.bannerImage && <img src={resolveImageUrl(previewPost.bannerImage)} alt="" className="blog-details-banner" />}
          <div className="blog-details-meta">
            <div><span>STATUS</span><strong className={`blog-details-status is-${previewPost.status}`}>{previewPost.status}</strong></div>
            <div><span>LAST UPDATED</span><strong>{previewPost.updatedAt ? new Date(previewPost.updatedAt).toLocaleString() : "—"}</strong></div>
            <div><span>CREATED</span><strong>{previewPost.createdAt ? new Date(previewPost.createdAt).toLocaleDateString() : "—"}</strong></div>
          </div>
          <section className="blog-details-section"><span className="admin-eyebrow">SUMMARY</span><p>{previewPost.description || "No summary provided."}</p></section>
          <section className="blog-details-section blog-details-content"><span className="admin-eyebrow">POST CONTENT</span><article className="blog-content" dangerouslySetInnerHTML={{ __html: previewPost.content?.replace(/src=(['"])(\/uploads\/[^'"]+)\1/g, (_match, quote, path) => `src=${quote}${resolveImageUrl(path)}${quote}`) || "<p>No content added yet.</p>" }} /></section>
        </section>
      </div>}

      {commentsPost && <div className="admin-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setCommentsPost(null); }}>
        <section className="admin-modal blog-comments-modal">
          <div className="admin-modal-header"><div><span className="admin-eyebrow">BLOG COMMENTS</span><h2>{commentsPost.title}</h2><p>Review and moderate comments for this post.</p></div><button type="button" className="admin-icon-button" onClick={() => setCommentsPost(null)} aria-label="Close comments"><X size={18} /></button></div>
          {commentsLoading ? <div className="blog-comments-loading">Loading comments…</div> : comments.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>AUTHOR</th><th>COMMENT</th><th>SUBMITTED</th><th>STATUS</th></tr></thead><tbody>{comments.map((comment) => <tr key={comment.id}><td><strong>{comment.name}</strong><br /><a href={`mailto:${comment.email}`}>{comment.email}</a></td><td className="blog-comment-text">{comment.comment}</td><td>{new Date(comment.createdAt).toLocaleString()}</td><td><select aria-label={`Moderate comment by ${comment.name}`} value={comment.status} disabled={moderatingId === comment.id} onChange={(event) => moderateComment(comment, event.target.value)}><option value="pending">Pending</option><option value="approved">Approve</option><option value="rejected">Reject</option></select>{moderatingId === comment.id && <small className="blog-comment-saving">Saving…</small>}</td></tr>)}</tbody></table></div> : <EmptyState title="No comments yet" detail="Comments for this post will appear here." />}
        </section>
      </div>}
    </div>
  );
}
