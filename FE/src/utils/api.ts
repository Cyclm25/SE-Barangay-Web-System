import axios from "axios";

export const api = axios.create({
  baseURL: "https://se-barangay-web-system.onrender.com",
});

api.interceptors.request.use((config) => {
  let token =
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("jwt");

  if (token) {
    token = token
      .trim()
      .replace(/^"|"$/g, "")
      .replace(/^Bearer\s+/i, "");
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  // TEMP debug helper: log whether auth header is attached (without exposing token)
  const hasAuthHeader = !!(config.headers as any)?.Authorization;
  if (typeof window !== "undefined") {
    // eslint-disable-next-line no-console
    console.debug(`[api] ${String(config.method || "GET").toUpperCase()} ${config.url} auth=${hasAuthHeader ? "yes" : "no"}`);
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const message = String(error?.response?.data?.error || error?.response?.data?.message || "");
    if (status === 401 && /token expired|invalid token|jwt malformed|jwt expired|invalid signature/i.test(message)) {
      localStorage.removeItem("token");
      localStorage.removeItem("authToken");
      localStorage.removeItem("jwt");
      if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
        window.location.reload();
      }
    }
    return Promise.reject(error);
  }
);
