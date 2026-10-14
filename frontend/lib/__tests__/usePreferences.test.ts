import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

const { apiMock, getTokenMock } = vi.hoisted(() => ({
  apiMock: vi.fn(),
  getTokenMock: vi.fn(),
}));

vi.mock("../api", () => ({
  api: apiMock,
  getToken: getTokenMock,
}));

import { usePreferences } from "../hooks/usePreferences";
import { STORAGE_KEYS } from "../constants";

describe("usePreferences", () => {
  beforeEach(() => {
    localStorage.clear();
    apiMock.mockReset();
    getTokenMock.mockReset();
  });

  afterEach(() => vi.restoreAllMocks());

  it("hydrates theme and language from localStorage", async () => {
    localStorage.setItem(STORAGE_KEYS.theme, "dark");
    localStorage.setItem(STORAGE_KEYS.lang, "ar");
    getTokenMock.mockReturnValue(null);

    const { result } = renderHook(() => usePreferences());

    await waitFor(() => expect(result.current.themeDark).toBe(true));
    expect(result.current.lang).toBe("ar");
    expect(apiMock).not.toHaveBeenCalled();
  });

  it("applies server preferences without calling the API", async () => {
    getTokenMock.mockReturnValue(null);

    const { result } = renderHook(() => usePreferences());
    act(() => result.current.applyServerPrefs({ theme: "dark", lang: "ar" }));

    expect(result.current.themeDark).toBe(true);
    expect(result.current.lang).toBe("ar");
    expect(apiMock).not.toHaveBeenCalled();
  });

  it("fetches server preferences on mount when authenticated", async () => {
    getTokenMock.mockReturnValue("tok");
    apiMock.mockResolvedValue({ theme: "dark", lang: "ar" });

    const { result } = renderHook(() => usePreferences());

    await waitFor(() => expect(result.current.themeDark).toBe(true));
    expect(result.current.lang).toBe("ar");
    expect(apiMock).toHaveBeenCalledWith("/preferences/");
  });

  it("persists a theme toggle to the server when authenticated", async () => {
    getTokenMock.mockReturnValue("tok");
    apiMock.mockResolvedValue({ theme: "light", lang: "fr" });

    const { result } = renderHook(() => usePreferences());
    await waitFor(() => expect(apiMock).toHaveBeenCalledWith("/preferences/"));

    act(() => result.current.toggleTheme());

    await waitFor(() =>
      expect(apiMock).toHaveBeenCalledWith(
        "/preferences/",
        expect.objectContaining({ method: "PATCH", body: JSON.stringify({ theme: "dark" }) }),
      ),
    );
  });
});
