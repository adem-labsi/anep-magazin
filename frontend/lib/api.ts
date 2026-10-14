import type { User } from "./types";
import { STORAGE_KEYS } from "./constants";

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEYS.token);
}

export function setToken(t: string | null): void {
  if (typeof window === "undefined") return;
  if (t) localStorage.setItem(STORAGE_KEYS.token, t);
  else localStorage.removeItem(STORAGE_KEYS.token);
}

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function api<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  const token = getToken();
  if (token) headers.Authorization = `Token ${token}`;
  const res = await fetch(`${API}${path}`, { ...options, headers });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const data = (await res.json()) as { detail?: string };
      msg = data.detail || JSON.stringify(data);
    } catch {
      /* keep statusText */
    }
    throw new ApiError(res.status, msg);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export const authApi = {
  login: (username: string, password: string) =>
    api<LoginResponse>("/auth/login/", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  logout: () => api<{ detail: string }>("/auth/logout/", { method: "POST" }),
};
