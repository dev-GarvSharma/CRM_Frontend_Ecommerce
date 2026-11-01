import { resolveImageUrl } from "../../utils/image.js";

export const getProductsFromCategories = (categoryResponse = []) =>
  categoryResponse.map((product) => {
    const variants = (product.variants || []).filter((variant) => variant.active);
    const productImages = (product.images || [])
      .map((image) => resolveImageUrl(typeof image === "string" ? image : image.path))
      .filter(Boolean);
    const variantImages = variants.flatMap((variant) => variant.images || [])
      .map((image) => resolveImageUrl(typeof image === "string" ? image : image?.path))
      .filter(Boolean);
    const images = productImages.length ? productImages : variantImages;
    const stock = variants.reduce((sum, variant) => sum + Number(variant.stock || 0), 0);
    const prices = variants.map((variant) => Number(variant.price));
    const comparePrices = variants.map((variant) => Number(variant.compareAtPrice)).filter(Number.isFinite);
    return {
      ...product,
      name: product.name || "Unnamed product",
      sku: variants.map((variant) => variant.sku).join(", ") || "—",
      category: product.category?.name || "Uncategorized",
      price: prices.length ? Math.min(...prices) : 0,
      mrp: comparePrices.length ? Math.max(...comparePrices) : 0,
      stock,
      images,
      image: images[0] || "",
      status: stock === 0 ? "Out of stock" : stock < 10 ? "Low stock" : "In stock",
    };
  });

export const getProductsFromVariants = (variantRows = []) =>
  variantRows.map((variant) => {
    const product = variant.product || {};
    const variantImages = (variant.images || [])
      .map((image) => resolveImageUrl(typeof image === "string" ? image : image?.path))
      .filter(Boolean);
    const productImages = (product.images || [])
      .map((image) => resolveImageUrl(typeof image === "string" ? image : image?.path))
      .filter(Boolean);
    const images = variantImages.length ? variantImages : productImages;
    const stock = Number(variant.stock || 0);
    return {
      id: variant.id,
      productId: product.id,
      name: product.name || "Unnamed product",
      category: product.category?.name || "Uncategorized",
      sku: variant.sku,
      options: variant.options || {},
      price: Number(variant.price || 0),
      mrp: Number(variant.compareAtPrice || 0),
      stock,
      image: images[0] || "",
      status: stock === 0 ? "Out of stock" : stock < 10 ? "Low stock" : "In stock",
    };
  });

export const formatRupees = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
