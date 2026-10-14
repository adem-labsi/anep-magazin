"use client";

import { useCallback } from "react";
import { PRINT_CSS_BON, PRINT_CSS_MODULE, preparePrintable, printHtml } from "../print";

export interface UsePrint {
  printModule: (key: string, title: string) => void;
  printElement: (node: HTMLElement | null, title: string) => void;
}

export function usePrint(showToast: (msg: string) => void): UsePrint {
  const printModule = useCallback(
    (key: string, title: string) => {
      const el = typeof document !== "undefined" ? document.getElementById(`module-${key}`) : null;
      if (!el) return;
      const ok = printHtml(preparePrintable(el), title, { css: PRINT_CSS_MODULE });
      if (!ok) showToast("Autorisez les fenêtres pop-up pour imprimer");
    },
    [showToast],
  );

  const printElement = useCallback(
    (node: HTMLElement | null, title: string) => {
      const ok = printHtml(preparePrintable(node), title, { css: PRINT_CSS_BON, width: 1024, height: 820 });
      if (!ok) showToast("Autorisez les fenêtres pop-up pour imprimer");
    },
    [showToast],
  );

  return { printModule, printElement };
}
