import { useEffect, useMemo, useState } from "react";
import {
  Download,
  Ellipsis,
  FileText,
  CircleHelp,
  Star,
  Link2,
  ListChecks,
  Pencil,
  Plus,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import {
  createProduct,
  getAllProducts,
  getProductDetails,
  exportProducts,
  updateProduct,
  updateProductsVisibility,
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
  getProductsFromCategories,
} from "../../models/catalog.js";
import { resolveImageUrl } from "../../../utils/image.js";
import { getAllCategories } from "../Categories/api.js";
import { downloadCsv } from "../../services/exportCsv.js";
import { Link } from "react-router-dom";

const emptyVariant = () => ({
  sku: "",
  optionsText: "",
  price: "",
  compareAtPrice: "",
  stock: "0",
  active: true,
  imageDraft: Array(5).fill(""),
  imagePaths: Array(5).fill(null),
  imageFiles: Array(5).fill(null),
});

const parseOptions = (text) =>
  Object.fromEntries(
    text
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [key, ...value] = part.split("=");
        const raw = value.join("=").trim();
        return [
          key.trim(),
          raw !== "" && Number.isFinite(Number(raw)) ? Number(raw) : raw,
        ];
      })
      .filter(([key, value]) => key && value),
  );
const parseNotes = (value) =>
  String(value || "")
    .split(",")
    .map((note) => note.trim())
    .filter(Boolean);

export default function Products({ globalSearch = "", onNotify }) {
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All status");
  const [category, setCategory] = useState("All categories");
  const [modal, setModal] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const [visibilitySaving, setVisibilitySaving] = useState(false);
  const [categoryRecords, setCategoryRecords] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);
  const [variantDraft, setVariantDraft] = useState([]);
  const [imageDraft, setImageDraft] = useState(Array(5).fill(""));
  const [imageFiles, setImageFiles] = useState(Array(5).fill(null));
  const [selected, setSelected] = useState([]);
  const [page, setPage] = useState(1);
  const [records, setRecords] = useState(20);
  const [dialog, setDialog] = useState(null);
  const [dialogProduct, setDialogProduct] = useState(null);
  const [dialogRows, setDialogRows] = useState([]);
  const [dialogDraft, setDialogDraft] = useState(null);
  const [editingRowIndex, setEditingRowIndex] = useState(null);
  const [savingDialog, setSavingDialog] = useState(false);
  const openProductDialog = async (kind, product) => {
    const result = await getProductDetails(product.id);
    if (!result.success)
      return onNotify(result.message || "Could not load product details.");
    setDialogProduct(result.data.data);
    const property = {
      reels: "reelsLinks",
      features: "featureNotes",
      faq: "faqs",
    }[kind];
    setDialogRows(
      property
        ? (result.data.data[property] || []).map((row) => ({ ...row }))
        : [],
    );
    setDialogDraft(null);
    setEditingRowIndex(null);
    setDialog(kind);
  };
  const blankContentRow = () =>
    dialog === "reels"
      ? { url: "" }
      : dialog === "features"
        ? { text: "", image: "" }
        : { question: "", answer: "" };
  const beginAddContentRow = () => {
    setEditingRowIndex(null);
    setDialogDraft(blankContentRow());
  };
  const editContentRow = (index) => {
    setEditingRowIndex(index);
    setDialogDraft({ ...dialogRows[index] });
  };
  const commitContentRow = () => {
    if (!dialogDraft) return;
    const isValid =
      dialog === "reels"
        ? Boolean(dialogDraft.url?.trim())
        : dialog === "features"
          ? Boolean(dialogDraft.text?.trim())
          : Boolean(dialogDraft.question?.trim() && dialogDraft.answer?.trim());
    if (!isValid) {
      onNotify("Complete the required fields before adding this item.");
      return;
    }
    setDialogRows((current) =>
      editingRowIndex === null
        ? [...current, dialogDraft]
        : current.map((row, index) =>
            index === editingRowIndex ? dialogDraft : row,
          ),
    );
    setDialogDraft(null);
    setEditingRowIndex(null);
  };
  const saveProductDialog = async (event) => {
    event.preventDefault();
    if (dialogDraft) {
      onNotify("Add or cancel the item you are editing before saving.");
      return;
    }
    const form = new FormData(event.currentTarget);
    const product = dialogProduct;
    const values = {
      name: product.name,
      slug: product.slug,
      categoryId: product.categoryId,
      brand: product.brand || "",
      concentration: product.concentration || "",
      fragranceFamily: product.fragranceFamily || "",
      topNotes: product.topNotes || [],
      heartNotes: product.heartNotes || [],
      baseNotes: product.baseNotes || [],
      attributes: product.attributes || {},
      description: product.description || "",
      showOnShop: product.showOnShop,
      status: product.status,
      variants: (product.variants || []).map(
        ({
          id,
          sku,
          options,
          images,
          price,
          compareAtPrice,
          stock,
          active,
        }) => ({
          id,
          sku,
          options,
          images,
          price,
          compareAtPrice,
          stock,
          active,
        }),
      ),
      sprays: product.sprays,
    };
    const relationName = {
      reels: "reelsLinks",
      features: "featureNotes",
      faq: "faqs",
    }[dialog];
    const featureNoteFiles = [];
    if (relationName) {
      values[relationName] = dialogRows.map(({ imageFile, ...row }, index) => {
        if (imageFile) featureNoteFiles.push({ index, imageFile });
        return row;
      });
    }
    if (dialog === "meta")
      Object.assign(values, {
        metaTitle: form.get("metaTitle"),
        metaDescription: form.get("metaDescription"),
        metaKeywords: form.get("metaKeywords"),
        url: form.get("url"),
        canonicalUrl: form.get("canonicalUrl"),
        robotsTags: form.get("robotsTags"),
      });
    const payload = new FormData();
    Object.entries(values).forEach(([key, value]) =>
      payload.append(
        key,
        typeof value === "object" ? JSON.stringify(value) : String(value ?? ""),
      ),
    );
    featureNoteFiles.forEach(({ index, imageFile }) =>
      payload.append(`featureNoteImage_${index}`, imageFile),
    );
    setSavingDialog(true);
    const result = await updateProduct(product.id, payload);
    setSavingDialog(false);
    if (!result.success)
      return onNotify(result.message || "Could not save product.");
    setDialog(null);
    setDialogProduct(null);
    load();
    onNotify("Product details saved.");
  };
  const load = () => {
    setLoading(true);
    setFailed(false);
    getAllProducts(page, records)
      .then((result) => {
        if (result.success) setResponse(result);
        else setFailed(true);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    getAllProducts(page, records)
      .then((result) => {
        if (result.success) setResponse(result);
        else setFailed(true);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [page, records]);
  useEffect(() => {
    getAllCategories(1, 100).then((result) => {
      if (result.success) setCategoryRecords(result.data?.data || []);
    });
  }, []);
  const products = useMemo(
    () => getProductsFromCategories(response?.data?.data || []),
    [response],
  );
  const visible = products.filter(
    (item) =>
      `${item.name} ${item.sku} ${item.category}`
        .toLowerCase()
        .includes((globalSearch.trim() || query).toLowerCase().trim()) &&
      (status === "All status" || item.status === status) &&
      (category === "All categories" || item.category === category),
  );
  const categories = [
    "All categories",
    ...new Set(products.map((item) => item.category)),
  ];
  const openCreate = () => {
    setEditingProduct(null);
    setVariantDraft([emptyVariant()]);
    setImageDraft(Array(5).fill(""));
    setImageFiles(Array(5).fill(null));
    setModal(true);
  };
  const openEdit = async (item) => {
    const result = await getProductDetails(item.id);
    if (!result.success) {
      onNotify(result.message || "Could not load product details.");
      return;
    }
    const product = result?.data?.data;
    setEditingProduct(product);
    setVariantDraft(
      (product.variants || []).map((variant) => ({
        id: variant.id,
        sku: variant.sku,
        optionsText: Object.entries(variant.options || {})
          .map(([key, value]) => `${key}=${value}`)
          .join(", "),
        price: String(variant.price),
        compareAtPrice:
          variant.compareAtPrice == null ? "" : String(variant.compareAtPrice),
        stock: String(variant.stock),
        active: variant.active,
        imageDraft: Array.from(
          { length: 5 },
          (_, index) => resolveImageUrl(variant.images?.[index]) || "",
        ),
        imagePaths: Array.from(
          { length: 5 },
          (_, index) => variant.images?.[index] || null,
        ),
        imageFiles: Array(5).fill(null),
      })),
    );
    setImageDraft(
      Array.from(
        { length: 5 },
        (_, index) => resolveImageUrl(product.images?.[index]?.path) || "",
      ),
    );
    setImageFiles(Array(5).fill(null));
    setModal(true);
  };
  const updateImage = (index, file) => {
    if (!file) return;
    setImageFiles((current) =>
      current.map((currentFile, imageIndex) =>
        imageIndex === index ? file : currentFile,
      ),
    );
    const reader = new FileReader();
    reader.onload = () =>
      setImageDraft((current) =>
        current.map((image, imageIndex) =>
          imageIndex === index ? String(reader.result) : image,
        ),
      );
    reader.readAsDataURL(file);
  };
  const updateVariantImage = (variantIndex, imageIndex, file) => {
    setVariantDraft((current) =>
      current.map((variant, rowIndex) => {
        if (rowIndex !== variantIndex) return variant;
        const imageFiles = [...(variant.imageFiles || Array(5).fill(null))];
        const imagePaths = [...(variant.imagePaths || Array(5).fill(null))];
        imageFiles[imageIndex] = file || null;
        imagePaths[imageIndex] = null;
        return { ...variant, imageFiles, imagePaths };
      }),
    );
    if (!file) {
      setVariantDraft((current) =>
        current.map((variant, rowIndex) =>
          rowIndex === variantIndex
            ? {
                ...variant,
                imageDraft: variant.imageDraft.map((image, index) =>
                  index === imageIndex ? "" : image,
                ),
              }
            : variant,
        ),
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      setVariantDraft((current) =>
        current.map((variant, rowIndex) =>
          rowIndex === variantIndex
            ? {
                ...variant,
                imageDraft: variant.imageDraft.map((image, index) =>
                  index === imageIndex ? String(reader.result) : image,
                ),
              }
            : variant,
        ),
      );
    reader.readAsDataURL(file);
  };

  const setSelectedProductsVisible = async () => {
    setVisibilitySaving(true);
    const result = await updateProductsVisibility(selected, true);
    setVisibilitySaving(false);
    if (!result.success) {
      onNotify(result.message || "Could not update product visibility.");
      return;
    }
    load();
    setSelected([]);
    onNotify("Product visibility updated.");
  };

  if (loading) return <LoadingState label="Loading product catalog" />;
  if (failed) return <ErrorState retry={load} />;
  return (
    <div className="admin-page-content">
      <PageHeading
        eyebrow="CATALOG"
        title="Products"
        description="Manage your catalog, pricing and product visibility."
        action={
          <div className="admin-heading-actions">
            <button
              className="admin-button admin-button-secondary"
              onClick={async () => {
                const result = await exportProducts();
                const rows = result.data?.data || [];
                onNotify(
                  result.success
                    ? downloadCsv("perfume-products.csv", rows)
                      ? "Products downloaded."
                      : "No products to export."
                    : result.message || "Could not export products.",
                );
              }}
            >
              <Download size={16} />
              Export
            </button>
            <button
              className="admin-button admin-button-dark"
              onClick={openCreate}
            >
              <Plus size={17} />
              Add product
            </button>
          </div>
        }
      />
      <div className="admin-summary-strip">
        <div>
          <span>All products</span>
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
            placeholder="Search products or SKU"
          />
          <div className="admin-filter-group">
            <SlidersHorizontal size={15} />
            <SelectField
              value={category}
              onChange={setCategory}
              options={categories}
              ariaLabel="Filter by category"
            />
            <SelectField
              value={status}
              onChange={setStatus}
              options={["All status", "In stock", "Low stock", "Out of stock"]}
              ariaLabel="Filter by stock status"
            />
          </div>
        </div>
        {selected.length > 0 && (
          <div className="admin-bulk-bar">
            <span>{selected.length} products selected</span>
            <button
              disabled={visibilitySaving}
              onClick={setSelectedProductsVisible}
            >
              {visibilitySaving ? "Updating…" : "Set visible"}
            </button>
            <button onClick={() => setSelected([])}>Clear</button>
          </div>
        )}
        <div className="admin-table-wrap">
          <table className="admin-table admin-products-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    aria-label="Select all products"
                    checked={
                      visible.length > 0 && selected.length === visible.length
                    }
                    onChange={(event) =>
                      setSelected(
                        event.target.checked
                          ? visible.map((item) => item.id)
                          : [],
                      )
                    }
                  />
                </th>
                <th>PRODUCT</th>
                <th>SKU</th>
                <th>CATEGORY</th>
                <th>PRICE</th>
                <th>INVENTORY</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => (
                <tr key={item.id}>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`Select ${item.name}`}
                      checked={selected.includes(item.id)}
                      onChange={(event) =>
                        setSelected((current) =>
                          event.target.checked
                            ? [...current, item.id]
                            : current.filter((id) => id !== item.id),
                        )
                      }
                    />
                  </td>
                  <td>
                    <div className="admin-product-cell">
                      <div className="admin-product-thumb">
                        {item.image && <img src={item.image} alt="" />}
                      </div>
                      <div>
                        <strong>{item.name}</strong>
                        <span>{item.brand || "Perfume"}</span>
                      </div>
                    </div>
                  </td>
                  <td className="admin-code admin-product-sku" title={item.sku}>
                    {item.sku}
                  </td>
                  <td>{item.category}</td>
                  <td className="admin-table-total">
                    {formatRupees(item.price)}{" "}
                    <small className="admin-old-price">
                      {formatRupees(item.mrp)}
                    </small>
                  </td>
                  <td>{item.stock} units</td>
                  <td>
                    <StatusPill>{item.status}</StatusPill>
                  </td>
                  <td className="admin-product-action-cell">
                    <div className="admin-product-actions">
                      <button
                        className="admin-icon-button table-more"
                        aria-label={`Edit ${item.name}`}
                        title="Edit product"
                        onClick={() => openEdit(item)}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className="admin-icon-button table-more"
                        title="Metadata"
                        onClick={() => openProductDialog("meta", item)}
                      >
                        <FileText size={15} />
                      </button>
                      <button
                        className="admin-icon-button table-more"
                        title="Reel links"
                        onClick={() => openProductDialog("reels", item)}
                      >
                        <Link2 size={15} />
                      </button>
                      <button
                        className="admin-icon-button table-more"
                        title="Feature notes"
                        onClick={() => openProductDialog("features", item)}
                      >
                        <ListChecks size={15} />
                      </button>
                      <button
                        className="admin-icon-button table-more"
                        title="FAQs"
                        onClick={() => openProductDialog("faq", item)}
                      >
                        <CircleHelp size={15} />
                      </button>
                      <Link
                        className="admin-icon-button table-more"
                        title="Reviews and ratings"
                        to={`/admin/reviews?productId=${item.id}`}
                      >
                        <Star size={15} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!visible.length && <EmptyState title="No products match" />}
        </div>
        <ListPagination
          meta={response?.data?.meta}
          page={page}
          records={records}
          onPageChange={setPage}
          onRecordsChange={(size) => {
            setPage(1);
            setRecords(size);
          }}
          label="products"
        />
      </section>
      {modal && (
        <AdminPortal>
          <div
            className="admin-modal-backdrop admin-product-backdrop"
            role="presentation"
            onMouseDown={(event) =>
              event.target === event.currentTarget &&
              (setModal(false), setEditingProduct(null))
            }
          >
            <form
              className="admin-modal admin-product-modal"
              onSubmit={async (event) => {
                event.preventDefault();
                const values = new FormData(event.currentTarget);
                const filesToUpload = imageFiles.filter(Boolean);
                const images = imageDraft
                  .map((image, index) =>
                    imageFiles[index]
                      ? null
                      : editingProduct?.images?.[index]?.path ||
                        (image.startsWith("/uploads/") ? image : null),
                  )
                  .filter(Boolean);
                const variants = variantDraft
                  .map((variant, formIndex) => ({
                    ...variant,
                    formIndex,
                  }))
                  .filter(
                    (variant) => variant.sku.trim() && variant.price !== "",
                  )
                  .map((variant) => ({
                    id: variant.id,
                    formIndex: variant.formIndex,
                    sku: variant.sku.trim(),
                    options: parseOptions(variant.optionsText),
                    price: Number(variant.price),
                    compareAtPrice:
                      variant.compareAtPrice === ""
                        ? null
                        : Number(variant.compareAtPrice),
                    stock: Number(variant.stock),
                    active: variant.active !== false,
                    images: variant.imagePaths || [],
                  }));
                if (!variants.length) {
                  onNotify("Add at least one variant with a SKU and price.");
                  return;
                }
                let attributes;
                try {
                  attributes = JSON.parse(values.get("attributes") || "{}");
                } catch {
                  onNotify("Product attributes must be valid JSON.");
                  return;
                }
                const next = {
                  name: values.get("name"),
                  slug: values.get("slug"),
                  categoryId: values.get("categoryId"),
                  brand: values.get("brand"),
                  concentration: values.get("concentration"),
                  fragranceFamily: values.get("fragranceFamily"),
                  topNotes: parseNotes(values.get("topNotes")),
                  heartNotes: parseNotes(values.get("heartNotes")),
                  baseNotes: parseNotes(values.get("baseNotes")),
                  description: values.get("description"),
                  attributes,
                  sprays:
                    values.get("sprays") === ""
                      ? ""
                      : Number(values.get("sprays")),
                  labelText: values.get("labelText"),
                  showOnShop: values.get("showOnShop") === "on",
                  variants,
                  images,
                };
                const productFormData = new FormData();
                Object.entries(next).forEach(([key, value]) => {
                  productFormData.append(
                    key,
                    ["images", "variants", "attributes"].includes(key)
                      ? JSON.stringify(value)
                      : String(value),
                  );
                });
                filesToUpload.forEach((file) =>
                  productFormData.append("images", file),
                );
                variants.forEach((variant) => {
                  const draft = variantDraft[variant.formIndex];
                  (draft?.imageFiles || []).forEach((file, imageIndex) => {
                    if (file)
                      productFormData.append(
                        `variantImage_${variant.formIndex}_${imageIndex}`,
                        file,
                      );
                  });
                });
                setSavingProduct(true);
                const result = editingProduct
                  ? await updateProduct(editingProduct.id, productFormData)
                  : await createProduct(productFormData);
                setSavingProduct(false);
                if (!result.success) {
                  onNotify(result.message || "Could not save product.");
                  return;
                }
                load();
                onNotify(
                  editingProduct
                    ? "Perfume product updated."
                    : "Perfume product created.",
                );
                setModal(false);
                setEditingProduct(null);
              }}
            >
              <div className="admin-modal-header">
                <div>
                  <span className="admin-eyebrow">
                    {editingProduct
                      ? "UPDATE CATALOG ITEM"
                      : "NEW CATALOG ITEM"}
                  </span>
                  <h2>{editingProduct ? "Edit product" : "Add product"}</h2>
                </div>
                <button
                  type="button"
                  className="admin-icon-button"
                  aria-label="Close"
                  onClick={() => {
                    setModal(false);
                    setEditingProduct(null);
                  }}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="admin-image-editor">
                <div className="admin-image-editor-heading">
                  <div>
                    <strong>Product images</strong>
                    <span>
                      Add up to five images. The first image is used as the main
                      image.
                    </span>
                  </div>
                  <small>{imageDraft.filter(Boolean).length}/5</small>
                </div>
                <div className="admin-image-upload-grid">
                  {imageDraft.map((image, index) => (
                    <div
                      className={`admin-image-slot ${image ? "has-image" : ""}`}
                      key={index}
                    >
                      {image ? (
                        <img
                          src={image}
                          alt={`Product image ${index + 1} preview`}
                        />
                      ) : (
                        <span>
                          {index === 0 ? "Main" : `Image ${index + 1}`}
                        </span>
                      )}
                      <label
                        className="admin-image-file-label"
                        aria-label={
                          image
                            ? `Replace image ${index + 1}`
                            : `Add image ${index + 1}`
                        }
                        title={image ? "Replace image" : "Add image"}
                      >
                        {image ? "Replace" : <Plus size={15} />}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(event) =>
                            updateImage(index, event.target.files?.[0])
                          }
                        />
                      </label>
                      {image && (
                        <button
                          className="admin-image-remove"
                          type="button"
                          aria-label={`Remove image ${index + 1}`}
                          onClick={() => {
                            setImageDraft((current) =>
                              current.map((item, imageIndex) =>
                                imageIndex === index ? "" : item,
                              ),
                            );
                            setImageFiles((current) =>
                              current.map((file, imageIndex) =>
                                imageIndex === index ? null : file,
                              ),
                            );
                          }}
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <label>
                Product name
                <input
                  name="name"
                  required
                  defaultValue={editingProduct?.name || ""}
                  placeholder="e.g. Cedar Coast Eau de Parfum"
                />
              </label>
              <div className="admin-form-row">
                <label>
                  Product URL slug
                  <input
                    name="slug"
                    defaultValue={editingProduct?.slug || ""}
                    placeholder="cedar-coast-eau-de-parfum"
                  />
                </label>
                <label>
                  Category
                  <select
                    name="categoryId"
                    required
                    defaultValue={
                      editingProduct?.categoryId || categoryRecords[0]?.id || ""
                    }
                  >
                    {categoryRecords.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="admin-form-row">
                <label>
                  Material
                  <input
                    name="brand"
                    defaultValue={editingProduct?.brand || ""}
                    placeholder="Maison Aroma"
                  />
                </label>
                <label>
                  Product attributes (JSON)
                  <input
                    name="attributes"
                    defaultValue={JSON.stringify(
                      editingProduct?.attributes || {},
                    )}
                    placeholder='{"season":"Summer"}'
                  />
                </label>
              </div>
              <div className="admin-form-row">
                <label>
                  Concentration
                  <input
                    name="concentration"
                    defaultValue={editingProduct?.concentration || ""}
                    placeholder="Eau de Parfum"
                  />
                </label>
                <label>
                  Fragrance family
                  <input
                    name="fragranceFamily"
                    defaultValue={editingProduct?.fragranceFamily || ""}
                    placeholder="Woody aromatic"
                  />
                </label>
              </div>
              <div className="admin-form-row">
                <label>
                  Top notes
                  <input
                    name="topNotes"
                    defaultValue={(editingProduct?.topNotes || []).join(", ")}
                    placeholder="Bergamot, cardamom"
                  />
                </label>
                <label>
                  Heart notes
                  <input
                    name="heartNotes"
                    defaultValue={(editingProduct?.heartNotes || []).join(", ")}
                    placeholder="Jasmine, rose"
                  />
                </label>
              </div>
              <label>
                Base notes
                <input
                  name="baseNotes"
                  defaultValue={(editingProduct?.baseNotes || []).join(", ")}
                  placeholder="Cedar, musk"
                />
              </label>
              <label className="admin-checkbox-label">
                <input
                  name="showOnShop"
                  type="checkbox"
                  defaultChecked={editingProduct?.showOnShop ?? true}
                />
                Show on storefront
              </label>
              <label>
                Description
                <textarea
                  name="description"
                  rows="3"
                  defaultValue={editingProduct?.description || ""}
                  placeholder="Materials, care, dimensions, and styling details"
                />
              </label>
              <label>
                Number of sprays
                <input
                  type="number"
                  min="0"
                  step="1"
                  name="sprays"
                  defaultValue={editingProduct?.sprays ?? ""}
                  placeholder="2"
                />
              </label>
              <label>
                Label text
                <input
                  name="labelText"
                  defaultValue={editingProduct?.labelText || ""}
                  placeholder="Bestseller"
                />
              </label>
              <section className="admin-variant-editor">
                <div className="admin-image-editor-heading">
                  <div>
                    <strong>Sellable variants</strong>
                    <span>
                      Each row has its own SKU, options, price and stock.
                    </span>
                  </div>
                  <button
                    type="button"
                    className="admin-button admin-button-secondary"
                    onClick={() =>
                      setVariantDraft((current) => [...current, emptyVariant()])
                    }
                  >
                    <Plus size={14} /> Add variant
                  </button>
                </div>
                {variantDraft.map((variant, index) => (
                  <div className="admin-variant-row" key={variant.id || index}>
                    <div className="admin-form-row">
                      <label>
                        SKU
                        <input
                          required
                          value={variant.sku}
                          onChange={(event) =>
                            setVariantDraft((current) =>
                              current.map((row, rowIndex) =>
                                rowIndex === index
                                  ? { ...row, sku: event.target.value }
                                  : row,
                              ),
                            )
                          }
                          placeholder="RING-ROSE-06"
                        />
                      </label>
                      <label>
                        Size and options
                        <input
                          value={variant.optionsText}
                          onChange={(event) =>
                            setVariantDraft((current) =>
                              current.map((row, rowIndex) =>
                                rowIndex === index
                                  ? { ...row, optionsText: event.target.value }
                                  : row,
                              ),
                            )
                          }
                          placeholder="volumeMl=50"
                        />
                      </label>
                    </div>
                    <div className="admin-form-row">
                      <label>
                        Selling price (₹)
                        <input
                          required
                          type="number"
                          min="0"
                          value={variant.price}
                          onChange={(event) =>
                            setVariantDraft((current) =>
                              current.map((row, rowIndex) =>
                                rowIndex === index
                                  ? { ...row, price: event.target.value }
                                  : row,
                              ),
                            )
                          }
                        />
                      </label>
                      <label>
                        Compare-at price (₹)
                        <input
                          type="number"
                          min="0"
                          value={variant.compareAtPrice}
                          onChange={(event) =>
                            setVariantDraft((current) =>
                              current.map((row, rowIndex) =>
                                rowIndex === index
                                  ? {
                                      ...row,
                                      compareAtPrice: event.target.value,
                                    }
                                  : row,
                              ),
                            )
                          }
                        />
                      </label>
                    </div>
                    <div className="admin-form-row">
                      <label>
                        Stock quantity
                        <input
                          required
                          type="number"
                          min="0"
                          value={variant.stock}
                          onChange={(event) =>
                            setVariantDraft((current) =>
                              current.map((row, rowIndex) =>
                                rowIndex === index
                                  ? { ...row, stock: event.target.value }
                                  : row,
                              ),
                            )
                          }
                        />
                      </label>
                      <label className="admin-variant-active">
                        Available for sale
                        <input
                          type="checkbox"
                          checked={variant.active !== false}
                          onChange={(event) =>
                            setVariantDraft((current) =>
                              current.map((row, rowIndex) =>
                                rowIndex === index
                                  ? { ...row, active: event.target.checked }
                                  : row,
                              ),
                            )
                          }
                        />
                      </label>
                      {variantDraft.length > 1 && (
                        <button
                          type="button"
                          className="admin-text-button"
                          onClick={() =>
                            setVariantDraft((current) =>
                              current.filter(
                                (_, rowIndex) => rowIndex !== index,
                              ),
                            )
                          }
                        >
                          Remove variant
                        </button>
                      )}
                    </div>
                    <div className="admin-variant-images">
                      <div className="admin-image-editor-heading">
                        <div>
                          <strong>Variant images</strong>
                          <span>
                            Up to five photos shown when this variant is
                            selected.
                          </span>
                        </div>
                        <small>
                          {variant.imageDraft.filter(Boolean).length}/5
                        </small>
                      </div>
                      <div className="admin-image-upload-grid">
                        {variant.imageDraft.map((image, imageIndex) => (
                          <div
                            className={`admin-image-slot ${image ? "has-image" : ""}`}
                            key={imageIndex}
                          >
                            {image ? (
                              <img
                                src={image}
                                alt={`${variant.optionsText || variant.sku || `Variant ${index + 1}`} image ${imageIndex + 1}`}
                              />
                            ) : (
                              <span>
                                {imageIndex === 0
                                  ? "Main"
                                  : `Image ${imageIndex + 1}`}
                              </span>
                            )}
                            <label
                              className="admin-image-file-label"
                              aria-label={
                                image
                                  ? `Replace variant image ${imageIndex + 1}`
                                  : `Add variant image ${imageIndex + 1}`
                              }
                              title={image ? "Replace image" : "Add image"}
                            >
                              {image ? "Replace" : <Plus size={15} />}
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/avif"
                                onChange={(event) => {
                                  const file = event.target.files?.[0];
                                  if (file)
                                    updateVariantImage(index, imageIndex, file);
                                }}
                              />
                            </label>
                            {image && (
                              <button
                                className="admin-image-remove"
                                type="button"
                                aria-label={`Remove variant image ${imageIndex + 1}`}
                                onClick={() =>
                                  updateVariantImage(index, imageIndex, null)
                                }
                              >
                                <X size={12} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </section>
              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-button admin-button-secondary"
                  onClick={() => {
                    setModal(false);
                    setEditingProduct(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  className="admin-button admin-button-dark"
                  type="submit"
                  disabled={savingProduct}
                >
                  {editingProduct ? <Pencil size={15} /> : <Plus size={16} />}
                  {savingProduct
                    ? "Saving…"
                    : editingProduct
                      ? "Save changes"
                      : "Create product"}
                </button>
              </div>
            </form>
          </div>
        </AdminPortal>
      )}
      {dialog && dialogProduct && (
        <AdminPortal>
          <div
            className="admin-modal-backdrop"
            role="presentation"
            onMouseDown={(event) =>
              event.target === event.currentTarget && setDialog(null)
            }
          >
            <form
              className={`admin-modal ${dialog === "meta" ? "" : "admin-product-content-modal"}`}
              onSubmit={saveProductDialog}
            >
              <div className="admin-modal-header">
                <div>
                  <span className="admin-eyebrow">
                    {dialog === "meta" ? "SEARCH PREVIEW" : "PRODUCT CONTENT"}
                  </span>
                  <h2>
                    {dialog === "meta"
                      ? "Metadata"
                      : dialog === "reels"
                        ? "Reel links"
                        : dialog === "features"
                          ? "Feature notes"
                          : "Product FAQs"}
                  </h2>
                  <p>{dialogProduct.name}</p>
                </div>
                <button
                  type="button"
                  className="admin-icon-button"
                  onClick={() => setDialog(null)}
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>
              {dialog === "meta" ? (
                <>
                  <label>
                    Meta title
                    <input
                      name="metaTitle"
                      defaultValue={dialogProduct.metaTitle || ""}
                    />
                  </label>
                  <label>
                    Meta description
                    <textarea
                      name="metaDescription"
                      rows="3"
                      defaultValue={dialogProduct.metaDescription || ""}
                    />
                  </label>
                  <label>
                    Keywords
                    <input
                      name="metaKeywords"
                      defaultValue={dialogProduct.metaKeywords || ""}
                    />
                  </label>
                  <label>
                    URL
                    <input name="url" defaultValue={dialogProduct.url || ""} />
                  </label>
                  <label>
                    Canonical URL
                    <input
                      name="canonicalUrl"
                      defaultValue={dialogProduct.canonicalUrl || ""}
                    />
                  </label>
                  <label>
                    Robots tags
                    <input
                      name="robotsTags"
                      defaultValue={dialogProduct.robotsTags || ""}
                      placeholder="index,follow"
                    />
                  </label>
                </>
              ) : (
                <div className="admin-product-content-list">
                  {dialogRows.map((row, index) => (
                    <article
                      className="admin-product-content-card"
                      key={row.id || index}
                    >
                      <div className="admin-product-content-card-body">
                        {dialog === "reels" && (
                          <a href={row.url} target="_blank" rel="noreferrer">
                            {row.url}
                          </a>
                        )}
                        {dialog === "features" && (
                          <>
                            <p>{row.text}</p>
                            {row.image && (
                              <img
                                className="admin-feature-note-thumb"
                                src={resolveImageUrl(row.image)}
                                alt=""
                              />
                            )}
                          </>
                        )}
                        {dialog === "faq" && (
                          <>
                            <strong>{row.question}</strong>
                            <p>{row.answer}</p>
                          </>
                        )}
                      </div>
                      <div className="admin-content-card-actions">
                        <button
                          type="button"
                          className="admin-icon-button"
                          title="Edit item"
                          aria-label="Edit item"
                          onClick={() => editContentRow(index)}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          className="admin-icon-button"
                          title="Delete item"
                          aria-label="Delete item"
                          onClick={() =>
                            setDialogRows((current) =>
                              current.filter((_, i) => i !== index),
                            )
                          }
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </article>
                  ))}
                  {!dialogRows.length && !dialogDraft && (
                    <p className="admin-content-empty">
                      No{" "}
                      {dialog === "reels"
                        ? "reel links"
                        : dialog === "features"
                          ? "feature notes"
                          : "FAQs"}{" "}
                      added yet.
                    </p>
                  )}
                  {dialogDraft && (
                    <div className="admin-content-editor">
                      <div className="admin-content-editor-heading">
                        <strong>
                          {editingRowIndex === null ? "New item" : "Edit item"}
                        </strong>
                        <button
                          type="button"
                          className="admin-text-button"
                          onClick={() => {
                            setDialogDraft(null);
                            setEditingRowIndex(null);
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                      {dialog === "reels" && (
                        <label>
                          Reel URL
                          <input
                            type="url"
                            required
                            autoFocus
                            value={dialogDraft.url || ""}
                            onChange={(event) =>
                              setDialogDraft((current) => ({
                                ...current,
                                url: event.target.value,
                              }))
                            }
                            placeholder="https://…"
                          />
                        </label>
                      )}
                      {dialog === "features" && (
                        <>
                          <label>
                            Text
                            <textarea
                              required
                              autoFocus
                              rows="3"
                              value={dialogDraft.text || ""}
                              onChange={(event) =>
                                setDialogDraft((current) => ({
                                  ...current,
                                  text: event.target.value,
                                }))
                              }
                            />
                          </label>
                          <label>
                            Image URL
                            <input
                              value={dialogDraft.image || ""}
                              onChange={(event) =>
                                setDialogDraft((current) => ({
                                  ...current,
                                  image: event.target.value,
                                }))
                              }
                              placeholder="https://… or /uploads/…"
                            />
                          </label>
                          <label>
                            Upload image
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp,image/avif"
                              onChange={(event) =>
                                setDialogDraft((current) => ({
                                  ...current,
                                  imageFile: event.target.files?.[0] || null,
                                }))
                              }
                            />
                            {dialogDraft.imageFile && (
                              <small>{dialogDraft.imageFile.name}</small>
                            )}
                          </label>
                        </>
                      )}
                      {dialog === "faq" && (
                        <>
                          <label>
                            Question
                            <input
                              required
                              autoFocus
                              value={dialogDraft.question || ""}
                              onChange={(event) =>
                                setDialogDraft((current) => ({
                                  ...current,
                                  question: event.target.value,
                                }))
                              }
                            />
                          </label>
                          <label>
                            Answer
                            <textarea
                              required
                              rows="3"
                              value={dialogDraft.answer || ""}
                              onChange={(event) =>
                                setDialogDraft((current) => ({
                                  ...current,
                                  answer: event.target.value,
                                }))
                              }
                            />
                          </label>
                        </>
                      )}
                      <button
                        type="button"
                        className="admin-button admin-button-dark"
                        onClick={commitContentRow}
                      >
                        {editingRowIndex === null ? "Add item" : "Update item"}
                      </button>
                    </div>
                  )}
                  {!dialogDraft && (
                    <button
                      type="button"
                      className="admin-button admin-button-secondary"
                      onClick={beginAddContentRow}
                    >
                      <Plus size={15} /> Add{" "}
                      {dialog === "reels"
                        ? "link"
                        : dialog === "features"
                          ? "note"
                          : "FAQ"}
                    </button>
                  )}
                </div>
              )}
              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-button admin-button-secondary"
                  onClick={() => setDialog(null)}
                >
                  Cancel
                </button>
                <button
                  className="admin-button admin-button-dark"
                  disabled={savingDialog}
                >
                  {savingDialog ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </AdminPortal>
      )}
    </div>
  );
}
