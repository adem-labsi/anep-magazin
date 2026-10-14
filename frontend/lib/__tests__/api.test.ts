import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ApiError, api, authApi, getToken, setToken } from "../api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

function mockFetch(status: number, body?: any) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 404 ? "Not Found" : "",
    json: async () => body,
  } as any);
}

describe("api", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it("sends the stored token as Authorization header", async () => {
    setToken("tok123");
    global.fetch = mockFetch(200, { ok: 1 });
    await api("/articles/");
    const call = (global.fetch as any).mock.calls[0];
    expect(call[0]).toBe(`${API_URL}/articles/`);
    expect(call[1].headers.Authorization).toBe("Token tok123");
  });

  it("parses error detail into the thrown message", async () => {
    global.fetch = mockFetch(400, { detail: "Quantité invalide" });
    await expect(api("/entrees/", { method: "POST", body: "{}" })).rejects.toThrow("Quantité invalide");
  });

  it("throws an ApiError carrying the HTTP status", async () => {
    global.fetch = mockFetch(401, { detail: "Authentication credentials were not provided." });
    const err = await api("/articles/").catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(401);
    expect((err as ApiError).message).toBe("Authentication credentials were not provided.");
  });

  it("returns undefined for 204 responses", async () => {
    global.fetch = mockFetch(204, undefined);
    const out = await api("/logout/", { method: "POST" });
    expect(out).toBeUndefined();
  });

  it("returns parsed json on success", async () => {
    global.fetch = mockFetch(200, [{ id: 1 }]);
    const out = await api("/articles/");
    expect(out).toEqual([{ id: 1 }]);
  });
});

describe("authApi", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it("logs in and returns token + user", async () => {
    global.fetch = mockFetch(200, { token: "abc", user: { username: "admin", role: "admin" } });
    const r = await authApi.login("admin", "admin123");
    expect(r.token).toBe("abc");
    const call = (global.fetch as any).mock.calls[0];
    expect(call[1].body).toContain("admin123");
  });
});

describe("token helpers", () => {
  it("getToken returns null when empty", () => {
    expect(getToken()).toBeNull();
  });

  it("round trips a token through localStorage", () => {
    setToken("xyz");
    expect(getToken()).toBe("xyz");
    setToken(null);
    expect(getToken()).toBeNull();
  });
});