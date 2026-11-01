// axiosWrapper.js
// Production-oriented Axios wrapper for React + Vite.
//
// Features:
// 1. Bearer token authentication.
// 2. Automatic access-token refresh on HTTP 401.
// 3. Shared refresh request for concurrent failed requests.
// 4. Logout and redirect when refresh fails.
// 5. Existing GET, POST, PUT, PATCH, DELETE and multipart helpers.
// 6. Country configuration has been removed.
//
// IMPORTANT:
// - Update REFRESH_TOKEN_URL to match your backend.
// - The refresh response is expected to contain:
//   { data: { accessToken: "...", refreshToken: "..." } }
// - LocalStorageService must implement the methods used below.
// - Prefer an HttpOnly refresh-token cookie over localStorage
//   if your backend supports cookie-based refresh authentication.

import axios from "axios";
import toast from "react-hot-toast";
import LocalStorageService from "../services/localStorageService";

// ============================================================
// 1. CONFIGURATION
// ============================================================

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:4000/api/v1";

// Keep the endpoint consistent with your existing backend.
const REFRESH_TOKEN_URL = "auth/refresh";

// Auth endpoints should not trigger automatic refresh.
const AUTH_ENDPOINTS = [
  "auth/login",
  "auth/register",
  "auth/verification/request",
  "auth/verification/confirm",
  "auth/refresh",
  "auth/logout",
];

// ============================================================
// 2. REQUEST HEADERS
// ============================================================

/**
 * Returns standard JSON headers.
 *
 * Active authentication header:
 * Authorization: Bearer <access-token>
 *
 * Optional headers are intentionally commented out.
 */
export const getHttpFormHeaders = () => {
  const token = LocalStorageService.getAccessToken();

  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",

    // Optional: enable only if your API requires it.
    // "ngrok-skip-browser-warning": "true",

    // Optional: enable only if your backend requires language.
    // language: LocalStorageService.getLanguageCode(),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;

    // Optional legacy header. Keep disabled unless your backend
    // explicitly requires both Authorization and x-access-token.
    // headers["x-access-token"] = token;
  }

  return headers;
};

/**
 * Headers for file uploads and multipart requests.
 *
 * Do NOT manually set Content-Type to multipart/form-data.
 * Axios/browser must set the multipart boundary automatically.
 */
export const getHttpFileFormHeaders = () => {
  const token = LocalStorageService.getAccessToken();

  const headers = {
    Accept: "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;

    // Optional legacy header; disabled by default.
    // headers["x-access-token"] = token;
  }

  return headers;
};

// ============================================================
// 3. URL AND PAYLOAD HELPERS
// ============================================================

/**
 * Removes query parameters whose values are empty, undefined,
 * or the literal string "undefined".
 *
 * Uses URLSearchParams so encoded values are handled safely.
 */
export const sanitizePath = (path = "") => {
  const [pathname, queryString] = path.split("?");

  if (!queryString) {
    return pathname;
  }

  const params = new URLSearchParams(queryString);

  for (const [key, value] of [...params.entries()]) {
    if (value === "" || value === "undefined" || value === "null") {
      params.delete(key);
    }
  }

  const query = params.toString();

  return query ? `${pathname}?${query}` : pathname;
};

/**
 * Removes empty, null and undefined values from a plain object.
 *
 * FormData is returned unchanged because its values must be
 * handled using FormData APIs, not Object.keys().
 */
export const sanitizeFormData = (formData) => {
  if (formData === null || formData === undefined) {
    return formData;
  }

  if (typeof FormData !== "undefined" && formData instanceof FormData) {
    return formData;
  }

  if (typeof formData !== "object" || Array.isArray(formData)) {
    return formData;
  }

  // Avoid mutating the caller's original payload.
  const sanitizedData = { ...formData };

  Object.keys(sanitizedData).forEach((key) => {
    const value = sanitizedData[key];

    if (value === "" || value === null || value === undefined) {
      delete sanitizedData[key];
    }
  });

  return sanitizedData;
};

/**
 * Converts empty strings and undefined values to null.
 * Useful when the API requires explicit null values.
 */
export const formatUnsanitizeFormData = (formData) => {
  if (formData === null || formData === undefined) {
    return formData;
  }

  if (typeof FormData !== "undefined" && formData instanceof FormData) {
    return formData;
  }

  if (typeof formData !== "object" || Array.isArray(formData)) {
    return formData;
  }

  const formattedData = { ...formData };

  Object.keys(formattedData).forEach((key) => {
    if (formattedData[key] === "" || formattedData[key] === undefined) {
      formattedData[key] = null;
    }
  });

  return formattedData;
};

// ============================================================
// 4. AXIOS CLIENT
// ============================================================

export const axiosClient = axios.create({
  baseURL,
  timeout: 30000,
  // The backend issues the rotating refresh token as an HttpOnly cookie.
  // Credentials are needed on login/register to store it and on API calls
  // so the cookie is available when a refresh is required.
  withCredentials: true,
  headers: {
    Accept: "application/json",
  },
});

const formatResponse = (response) => ({
  success: response.data?.success ?? (response.status >= 200 && response.status < 300),
  status: response.status,
  statusCode: response.data?.statusCode ?? response.status,
  message: response.data?.message,
  data: response.data,
});

// Separate client for refresh calls.
// This prevents the refresh request itself from recursively
// triggering the main client's refresh interceptor.
const refreshClient = axios.create({
  baseURL,
  timeout: 30000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },

  withCredentials: true,
});

// ============================================================
// 5. LOGOUT / SESSION EXPIRY
// ============================================================

let isLoggingOut = false;

/**
 * Clears authentication and redirects to the login entry point.
 *
 * Uses the cleanup method already present in your previous
 * wrapper: LocalStorageService.clearAuthData().
 */
export const logout = () => {
  // Prevent repeated redirects from concurrent failed requests.
  if (isLoggingOut) {
    return;
  }

  isLoggingOut = true;

  try {
    LocalStorageService.clearAuthData();
  } catch (storageError) {
    // Authentication must still redirect if storage cleanup fails.
    console.error("Unable to clear authentication data:", storageError);
  }

  const webURL = import.meta.env.VITE_WEB_URL || window.location.origin;

  // Preserve your existing session-expired query convention.
  window.location.replace(`${webURL.replace(/\/$/, "")}/?sessionExpired=true`);
};

// ============================================================
// 6. REQUEST INTERCEPTOR
// ============================================================

axiosClient.interceptors.request.use(
  (request) => {
    // Always read the latest token so refreshed tokens are used
    // by new requests.
    const token = LocalStorageService.getAccessToken();

    request.headers = request.headers || {};

    if (token) {
      request.headers.Authorization = `Bearer ${token}`;
    } else {
      // Do not accidentally send a stale token.
      delete request.headers.Authorization;
    }

    // Optional language header:
    // const language = LocalStorageService.getLanguageCode();
    // if (language) request.headers.language = language;

    // Optional x-access-token header:
    // if (token) request.headers["x-access-token"] = token;

    const requestPath = request.url || "";
    const requestQuery = requestPath.includes("?")
      ? `?${requestPath.split("?").slice(1).join("?")}`
      : "";
    const requestName = `${(request.method || "GET").toUpperCase()} ${requestPath.split("?")[0]}${requestQuery}`;
    request.metadata = { ...request.metadata, requestName };
    console.info(`[API] ${requestName}`);

    return request;
  },
  (error) => Promise.reject(error),
);

// ============================================================
// 7. REFRESH TOKEN STATE
// ============================================================

// All concurrent 401 responses share this one promise.
// This prevents multiple refresh calls from running at once.
let refreshingToken = null;

// ============================================================
// 8. RESPONSE INTERCEPTOR
// ============================================================

axiosClient.interceptors.response.use(
  (response) => {
    console.info(
      `[API] ${response.config.metadata?.requestName || response.config.url} → ${response.status}`,
    );
    return response;
  },

  async (error) => {
    const originalConfig = error.config;

    // Network errors or errors without a request configuration.
    if (!originalConfig) {
      return Promise.reject(error);
    }

    const status = error.response?.status;
    console.error(
      `[API] ${originalConfig.metadata?.requestName || originalConfig.url} → ${status || "network error"}`,
    );

    // Only refresh access tokens for HTTP 401 responses.
    // 403 means forbidden and should not automatically log out.
    if (status !== 401) {
      if ([500, 501, 502, 503, 504].includes(status)) {
        console.error("Server error occurred:", status);

        // Optional server-error redirect:
        // window.location.assign(
        //   `${window.location.origin}/server-error`
        // );
      }

      return Promise.reject(error);
    }

    // Normalize the endpoint so query strings do not interfere
    // with authentication endpoint matching.
    const requestURL = (originalConfig.url || "")
      .split("?")[0]
      .replace(/^\/+/, "");

    const isAuthEndpoint = AUTH_ENDPOINTS.some(
      (endpoint) => requestURL === endpoint.replace(/^\/+/, ""),
    );

    // Never refresh login, refresh, OTP, password or excluded
    // endpoints. Their errors belong to their own workflows.
    if (isAuthEndpoint) {
      return Promise.reject(error);
    }

    // Never retry the same request more than once.
    if (originalConfig._retry) {
      return Promise.reject(error);
    }

    originalConfig._retry = true;

    try {
      // If no refresh is running, start one.
      if (!refreshingToken) {
        refreshingToken = refreshClient
          .post(REFRESH_TOKEN_URL, {})
          .then((response) => {
            const tokenData = response.data?.data;

            if (!tokenData?.accessToken) {
              throw new Error(
                "Refresh response did not contain an access token.",
              );
            }

            // Keep this response shape aligned with your backend.
            LocalStorageService.setTokenData(tokenData);

            return tokenData;
          })
          .finally(() => {
            // Release the shared promise after success or failure.
            refreshingToken = null;
          });
      }

      // Wait for the shared refresh request.
      const tokenData = await refreshingToken;

      // Set the fresh access token on the original failed request.
      originalConfig.headers = originalConfig.headers || {};
      originalConfig.headers.Authorization = `Bearer ${tokenData.accessToken}`;

      // Retry the original request exactly once.
      return axiosClient.request(originalConfig);
    } catch (refreshError) {
      console.error("Access-token refresh failed:", refreshError);

      // If refresh fails, the session cannot be restored.
      logout();

      return Promise.reject(refreshError);
    }
  },
);

// ============================================================
// 9. STANDARDIZED ERROR HANDLER
// ============================================================

/**
 * Returns a consistent error object instead of throwing.
 * Its shape matches successful responses from formatResponse.
 */
export const handleError = (error, suppressToastOn404 = false) => {
  const response = error?.response;
  const status = response?.status || 500;

  const message =
    response?.data?.message ||
    response?.data?.error?.message ||
    (!response ? "Failed to connect to server" : "Server error!");

  // A request cancelled by the user is not a server failure.
  if (axios.isCancel(error) || error?.code === "ERR_CANCELED") {
    return {
      success: false,
      status: 499,
      statusCode: 499,
      message: "Request cancelled",
      data: null,
    };
  }

  if (!response) {
    toast.error(message);
    return { success: false, status, statusCode: status, message, data: null };
  }

  const responseURL =
    response.config?.url || response.request?.responseURL || "";

  // Preserve the existing behavior of suppressing notification
  // endpoint toasts and allowing callers to suppress 404 toasts.
  const isNotificationRequest = responseURL
    .toLowerCase()
    .includes("notification");

  if (!isNotificationRequest && !(suppressToastOn404 && status === 404)) {
    toast.error(message, {
      id: responseURL || message,
    });
  }

  return { success: false, status, statusCode: status, message, data: response.data };
};

// ============================================================
// 10. GET
// ============================================================

export const get = async (url, options = {}, suppressToastOn404 = false) => {
  try {
    const response = await axiosClient.get(sanitizePath(url), {
      ...options,
      headers: {
        ...getHttpFormHeaders(),
        ...options.headers,
      },
    });

    return formatResponse(response);
  } catch (error) {
    return handleError(error, suppressToastOn404);
  }
};

// ============================================================
// 11. POST
// ============================================================

export const post = async (
  url,
  payload,
  options = {},
  suppressToastOn404 = false,
) => {
  try {
    const response = await axiosClient.post(
      sanitizePath(url),
      sanitizeFormData(payload),
      {
        ...options,
        headers: {
          ...getHttpFormHeaders(),
          ...options.headers,
        },
      },
    );

    return formatResponse(response);
  } catch (error) {
    return handleError(error, suppressToastOn404);
  }
};

// ============================================================
// 12. POST WITHOUT SANITIZING
// ============================================================

export const postUnsanitized = async (url, payload, options = {}) => {
  try {
    const response = await axiosClient.post(
      sanitizePath(url),
      formatUnsanitizeFormData(payload),
      {
        ...options,
        headers: {
          ...getHttpFormHeaders(),
          ...options.headers,
        },
      },
    );

    return formatResponse(response);
  } catch (error) {
    return handleError(error);
  }
};

// ============================================================
// 13. POST MULTIPART / FILE UPLOAD
// ============================================================

export const postMultipart = async (url, payload, options = {}) => {
  try {
    const response = await axiosClient.post(
      sanitizePath(url),
      sanitizeFormData(payload),
      {
        ...options,
        headers: {
          ...getHttpFileFormHeaders(),
          ...options.headers,

          // Do not set Content-Type manually here.
          // The browser must add the multipart boundary.
        },
      },
    );

    return formatResponse(response);
  } catch (error) {
    return handleError(error);
  }
};

export const postMultipartUnsanitized = async (url, payload, options = {}) => {
  try {
    const response = await axiosClient.post(
      sanitizePath(url),
      formatUnsanitizeFormData(payload),
      {
        ...options,
        headers: {
          ...getHttpFileFormHeaders(),
          ...options.headers,
        },
      },
    );

    return formatResponse(response);
  } catch (error) {
    return handleError(error);
  }
};

// ============================================================
// 14. PUT
// ============================================================

export const put = async (url, payload, options = {}) => {
  try {
    const response = await axiosClient.put(
      sanitizePath(url),
      sanitizeFormData(payload),
      {
        ...options,
        headers: {
          ...getHttpFormHeaders(),
          ...options.headers,
        },
      },
    );

    return formatResponse(response);
  } catch (error) {
    return handleError(error);
  }
};

export const putUnsanitized = async (url, payload, options = {}) => {
  try {
    const response = await axiosClient.put(
      sanitizePath(url),
      formatUnsanitizeFormData(payload),
      {
        ...options,
        headers: {
          ...getHttpFormHeaders(),
          ...options.headers,
        },
      },
    );

    return formatResponse(response);
  } catch (error) {
    return handleError(error);
  }
};

// ============================================================
// 15. PUT MULTIPART / FILE UPLOAD
// ============================================================

export const putMultipart = async (url, payload, options = {}) => {
  try {
    const response = await axiosClient.put(
      sanitizePath(url),
      sanitizeFormData(payload),
      {
        ...options,
        headers: {
          ...getHttpFileFormHeaders(),
          ...options.headers,
        },
      },
    );

    return formatResponse(response);
  } catch (error) {
    return handleError(error);
  }
};

export const putMultipartUnsanitized = async (url, payload, options = {}) => {
  try {
    const response = await axiosClient.put(
      sanitizePath(url),
      formatUnsanitizeFormData(payload),
      {
        ...options,
        headers: {
          ...getHttpFileFormHeaders(),
          ...options.headers,
        },
      },
    );

    return formatResponse(response);
  } catch (error) {
    return handleError(error);
  }
};

// ============================================================
// 16. PATCH
// ============================================================

export const patch = async (url, payload, options = {}) => {
  try {
    const response = await axiosClient.patch(
      sanitizePath(url),
      sanitizeFormData(payload),
      {
        ...options,
        headers: {
          ...getHttpFormHeaders(),
          ...options.headers,
        },
      },
    );

    return formatResponse(response);
  } catch (error) {
    return handleError(error);
  }
};

export const patchUnsanitized = async (url, payload, options = {}) => {
  try {
    const response = await axiosClient.patch(
      sanitizePath(url),
      formatUnsanitizeFormData(payload),
      {
        ...options,
        headers: {
          ...getHttpFormHeaders(),
          ...options.headers,
        },
      },
    );

    return formatResponse(response);
  } catch (error) {
    return handleError(error);
  }
};

// ============================================================
// 17. DELETE
// ============================================================

export const destroy = async (url, options = {}) => {
  try {
    const response = await axiosClient.delete(sanitizePath(url), {
      ...options,
      headers: {
        ...getHttpFormHeaders(),
        ...options.headers,
      },
    });

    return formatResponse(response);
  } catch (error) {
    return handleError(error);
  }
};

// Keep the CRUD helper name used by the page API modules.
export const remove = destroy;
