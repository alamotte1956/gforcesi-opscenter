import { createClient } from "@base44/sdk";
import { appParams } from "@/lib/app-params";

const { appId, token, functionsVersion, appBaseUrl } = appParams;

const TOKEN_KEY = "gforcesi_fullstack_token";

function getLocalToken() {
  try {
    return window.localStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

function setLocalToken(t) {
  try {
    if (t) window.localStorage.setItem(TOKEN_KEY, t);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {}
}

async function apiRequest(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  const tok = getLocalToken();
  if (tok) headers.Authorization = `Bearer ${tok}`;
  const res = await fetch(path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.response = { status: res.status, data };
    throw err;
  }
  return data;
}

function createEntityClient(entityName) {
  return {
    list: (sort = "-created_date", limit = 1000) => {
      const qs = new URLSearchParams();
      if (sort) qs.set("sort", String(sort));
      if (limit) qs.set("limit", String(limit));
      return apiRequest(`/api/entities/${entityName}?${qs.toString()}`);
    },
    filter: (filterObj = {}, sort = "-created_date", limit = 1000) => {
      const qs = new URLSearchParams();
      qs.set("filter", JSON.stringify(filterObj));
      if (sort) qs.set("sort", String(sort));
      if (limit) qs.set("limit", String(limit));
      return apiRequest(`/api/entities/${entityName}?${qs.toString()}`);
    },
    get: (id) => apiRequest(`/api/entities/${entityName}/${encodeURIComponent(id)}`),
    create: (payload) => apiRequest(`/api/entities/${entityName}`, { method: "POST", body: payload }),
    bulkCreate: (items) => apiRequest(`/api/entities/${entityName}`, { method: "POST", body: items }),
    update: (id, patch) => apiRequest(`/api/entities/${entityName}/${encodeURIComponent(id)}`, { method: "PATCH", body: patch }),
    delete: (id) => apiRequest(`/api/entities/${entityName}/${encodeURIComponent(id)}`, { method: "DELETE" }),
    subscribe: () => () => {},
  };
}

function createStandaloneFullStackClient() {
  const entitiesProxy = new Proxy(
    {},
    {
      get(_target, prop) {
        if (typeof prop !== "string") return undefined;
        return createEntityClient(prop);
      },
    }
  );

  return {
    __mode: "standalone-fullstack",
    entities: entitiesProxy,
    auth: {
      me: () => apiRequest("/api/auth/me"),
      loginViaEmailPassword: async (email, password) => {
        const res = await apiRequest("/api/auth/login", { method: "POST", body: { email, password } });
        if (res.token) setLocalToken(res.token);
        return res;
      },
      verifyMfaChallenge: async (challengeToken, code) => {
        const res = await apiRequest("/api/auth/mfa/challenge", { method: "POST", body: { challengeToken, code } });
        if (res.token) setLocalToken(res.token);
        return res;
      },
      setupMfa: () => apiRequest("/api/auth/mfa/setup", { method: "POST" }),
      verifyMfa: (code) => apiRequest("/api/auth/mfa/verify", { method: "POST", body: { code } }),
      disableMfa: (password, code) => apiRequest("/api/auth/mfa/disable", { method: "POST", body: { password, code } }),
      changePassword: async (currentPassword, newPassword) => {
        const res = await apiRequest("/api/auth/change-password", {
          method: "POST",
          body: { currentPassword, newPassword },
        });
        if (res.token) setLocalToken(res.token);
        return res;
      },
      resetPasswordRequest: (email) =>
        apiRequest("/api/auth/forgot-password", { method: "POST", body: { email } }),
      resetPassword: ({ resetToken, email, recoveryKey, newPassword }) =>
        apiRequest("/api/auth/reset-password", {
          method: "POST",
          body: { resetToken, email, recoveryKey, newPassword },
        }),
      generateRecoveryKey: () =>
        apiRequest("/api/auth/recovery-key", { method: "POST" }),
      adminCreateResetLink: (userId) =>
        apiRequest(`/api/admin/users/${encodeURIComponent(userId)}/reset-link`, { method: "POST" }),
      logoutAll: async () => {
        const res = await apiRequest("/api/auth/logout-all", { method: "POST" });
        setLocalToken("");
        return res;
      },
      getSecurityStatus: () => apiRequest("/api/admin/security-status"),
      provisionUser: (payload) => apiRequest("/api/admin/users", { method: "POST", body: payload }),
      deleteUser: (id) => apiRequest(`/api/admin/users/${encodeURIComponent(id)}`, { method: "DELETE" }),
      register: async ({ email, password, full_name }) => {
        const res = await apiRequest("/api/auth/register", { method: "POST", body: { email, password, full_name } });
        if (res.token) setLocalToken(res.token);
        return res;
      },
      loginWithProvider: () => {
        window.location.href = "/login";
      },
      logout: async (redirectUrl) => {
        await apiRequest("/api/auth/logout", { method: "POST" }).catch(() => {});
        setLocalToken("");
        if (redirectUrl) window.location.href = "/";
      },
      redirectToLogin: (returnTo) => {
        const target = returnTo ? `/login?returnTo=${encodeURIComponent(returnTo)}` : "/login";
        window.location.href = target;
      },
    },
    functions: {
      invoke: async (name, payload = {}) => {
        const data = await apiRequest(`/api/functions/${encodeURIComponent(name)}`, {
          method: "POST",
          body: payload,
        });
        if (data && typeof data === "object" && !Array.isArray(data)) {
          return { ...data, data };
        }
        return { data };
      },
    },
    users: {
      inviteUser: (email, role = "user") =>
        apiRequest("/api/entities/User", { method: "POST", body: { email, role, full_name: email.split("@")[0] } }),
    },
    integrations: {
      Core: {
        InvokeLLM: async ({ prompt }) => apiRequest("/api/integrations/llm", { method: "POST", body: { prompt } }),
        UploadFile: async ({ file }) => {
          let filename = file?.name || "";
          if (!filename) {
            const mime = String(file?.type || "").toLowerCase();
            const ext = mime.includes("png") ? ".png" : mime.includes("webp") ? ".webp" : mime.includes("pdf") ? ".pdf" : ".jpg";
            filename = `capture_${Date.now()}${ext}`;
          }
          let dataBase64 = "";
          if (file && typeof file.arrayBuffer === "function") {
            const buf = await file.arrayBuffer();
            const bytes = new Uint8Array(buf);
            let binary = "";
            for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
            dataBase64 = btoa(binary);
          }
          return apiRequest("/api/integrations/upload", { method: "POST", body: { filename, dataBase64 } });
        },
        UploadPrivateFile: async ({ file }) => {
          let filename = file?.name || "";
          if (!filename) {
            const mime = String(file?.type || "").toLowerCase();
            const ext = mime.includes("pdf") ? ".pdf" : mime.includes("png") ? ".png" : ".jpg";
            filename = `compliance_${Date.now()}${ext}`;
          }
          let dataBase64 = "";
          if (file && typeof file.arrayBuffer === "function") {
            const buf = await file.arrayBuffer();
            const bytes = new Uint8Array(buf);
            let binary = "";
            for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
            dataBase64 = btoa(binary);
          }
          const res = await apiRequest("/api/integrations/upload", { method: "POST", body: { filename, dataBase64 } });
          return { ...res, file_uri: res.file_url };
        },
      },
    },
  };
}

export const isBase44CloudMode = Boolean(appId) && import.meta.env.VITE_HOSTING_TARGET !== "cloudflare";

// Dual-mode full-stack client:
// - When deployed on Base44 (VITE_BASE44_APP_ID set), uses official @base44/sdk
// - When running standalone Node.js + SQLite full-stack server, uses /api/* REST + JWT backend
export const base44 = isBase44CloudMode
  ? createClient({
      appId,
      token,
      functionsVersion,
      serverUrl: "",
      requiresAuth: false,
      appBaseUrl,
    })
  : createStandaloneFullStackClient();
