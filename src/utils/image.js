const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:4000/api/v1";
const IMAGE_BASE_URL =
  import.meta.env.VITE_IMAGE_BASE_URL || new URL(API_BASE_URL).origin;

export const resolveImageUrl = (imagePath) => {
  if (!imagePath || typeof imagePath !== "string") return "";
  if (/^(?:https?:|data:|blob:)/i.test(imagePath)) return imagePath;

  try {
    return new URL(imagePath, `${IMAGE_BASE_URL.replace(/\/$/, "")}/`).href;
  } catch {
    return imagePath;
  }
};
