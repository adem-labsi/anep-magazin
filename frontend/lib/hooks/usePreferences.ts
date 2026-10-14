"use client";

import { useCallback, useEffect, useState } from "react";
import { api, getToken } from "../api";
import { STORAGE_KEYS } from "../constants";
import type { Lang } from "../types";

export interface ServerPrefs {
  theme?: "light" | "dark" | string;
  lang?: Lang | string;
}

export interface UsePreferences {
  themeDark: boolean;
  lang: Lang;
  toggleTheme: () => void;
  setLang: (lang: Lang) => void;
  applyServerPrefs: (prefs: ServerPrefs) => void;
}

export function usePreferences(): UsePreferences {
  const [themeDark, setThemeDark] = useState(false);
  const [lang, setLang] = useState<Lang>("fr");

  useEffect(() => {
    let savedTheme = "light";
    let savedLang = "fr";
    try {
      savedTheme = localStorage.getItem(STORAGE_KEYS.theme) || "light";
      savedLang = localStorage.getItem(STORAGE_KEYS.lang) || "fr";
    } catch {
      /* ignore unavailable storage */
    }
    setThemeDark(savedTheme === "dark");
    setLang(savedLang === "ar" ? "ar" : "fr");
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.classList.toggle("dark", themeDark);
    try {
      localStorage.setItem(STORAGE_KEYS.theme, themeDark ? "dark" : "light");
    } catch {
      /* ignore */
    }
  }, [themeDark]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const rtl = lang === "ar";
    document.documentElement.lang = lang;
    document.documentElement.dir = rtl ? "rtl" : "ltr";
    document.body.style.direction = rtl ? "rtl" : "ltr";
    document.body.classList.toggle("rtl", rtl);
    try {
      localStorage.setItem(STORAGE_KEYS.lang, lang);
    } catch {
      /* ignore */
    }
  }, [lang]);

  const syncToServer = useCallback((patch: ServerPrefs) => {
    if (!getToken()) return;
    api("/preferences/", { method: "PATCH", body: JSON.stringify(patch) }).catch(() => {
      /* preferences are non-critical */
    });
  }, []);

  const toggleTheme = useCallback(() => {
    const next = !themeDark;
    setThemeDark(next);
    syncToServer({ theme: next ? "dark" : "light" });
  }, [themeDark, syncToServer]);

  const changeLang = useCallback((l: Lang) => {
    setLang(l);
    syncToServer({ lang: l });
  }, [syncToServer]);

  const applyServerPrefs = useCallback((prefs: ServerPrefs) => {
    if (prefs.theme === "dark" || prefs.theme === "light") {
      setThemeDark(prefs.theme === "dark");
    }
    if (prefs.lang === "ar" || prefs.lang === "fr") {
      setLang(prefs.lang);
    }
  }, []);

  useEffect(() => {
    if (!getToken()) return;
    api<ServerPrefs>("/preferences/")
      .then(applyServerPrefs)
      .catch(() => {
        /* ignore: falls back to local storage */
      });
  }, [applyServerPrefs]);

  return { themeDark, lang, toggleTheme, setLang: changeLang, applyServerPrefs };
}
