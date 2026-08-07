import { reactive, readonly } from "vue";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

const state = reactive({ user: null, ready: false });

export const apiRequest = async (path, options = {}) => {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  const data = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(data?.error || "Request failed");
  return data;
};

export const auth = readonly(state);

export const loadCurrentUser = async () => {
  try {
    const result = await apiRequest("/auth/me");
    state.user = result.data;
  } finally {
    state.ready = true;
  }
};

export const setCurrentUser = (user) => { state.user = user; };

export const logout = async () => {
  await apiRequest("/auth/logout", { method: "POST" });
  state.user = null;
};
