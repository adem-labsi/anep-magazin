import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

const { apiMock } = vi.hoisted(() => ({ apiMock: vi.fn() }));

vi.mock("../api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api")>();
  return { ...actual, api: apiMock };
});

import { ApiError } from "../api";
import { useStockData } from "../hooks/useStockData";

const ALL_PATHS = [
  "/articles/", "/entrees/", "/sorties/", "/ajustements/", "/mouvements/",
  "/inventaires/", "/audit/", "/users/", "/dashboard/", "/alertes/",
];

describe("useStockData", () => {
  beforeEach(() => {
    apiMock.mockReset();
    apiMock.mockResolvedValue([]);
  });

  afterEach(() => vi.restoreAllMocks());

  it("load() fetches every endpoint", async () => {
    const { result } = renderHook(() => useStockData(vi.fn()));

    await act(async () => {
      await result.current.load();
    });

    const calledPaths = apiMock.mock.calls.map((c) => c[0]);
    for (const p of ALL_PATHS) expect(calledPaths).toContain(p);
    expect(apiMock).toHaveBeenCalledTimes(ALL_PATHS.length);
  });

  it("refresh(keys) calls only the requested endpoints", async () => {
    const { result } = renderHook(() => useStockData(vi.fn()));

    await act(async () => {
      await result.current.refresh(["articles", "dashboard"]);
    });

    const calledPaths = apiMock.mock.calls.map((c) => c[0]);
    expect(calledPaths).toEqual(["/articles/", "/dashboard/"]);
  });

  it("calls onUnauthorized on a 401 and does not toast", async () => {
    const showToast = vi.fn();
    const onUnauthorized = vi.fn();
    apiMock.mockImplementation((path: string) =>
      path === "/articles/" ? Promise.reject(new ApiError(401, "Unauthorized")) : Promise.resolve([]),
    );

    const { result } = renderHook(() => useStockData(showToast, onUnauthorized));

    await act(async () => {
      await result.current.refresh(["articles"]);
    });

    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(showToast).not.toHaveBeenCalled();
  });

  it("toasts non-auth errors without calling onUnauthorized", async () => {
    const showToast = vi.fn();
    const onUnauthorized = vi.fn();
    apiMock.mockRejectedValue(new ApiError(500, "Serveur indisponible"));

    const { result } = renderHook(() => useStockData(showToast, onUnauthorized));

    await act(async () => {
      await result.current.refresh(["articles"]);
    });

    await waitFor(() => expect(showToast).toHaveBeenCalled());
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});
