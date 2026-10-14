export const PRINT_CSS_MODULE =
  "@page{size:A4 landscape;margin:12mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}" +
  "body{font-family:Arial,sans-serif;color:#111;margin:0}h2{color:#071b3a;margin:0 0 12px}" +
  "table{width:100%;border-collapse:collapse;table-layout:auto}th,td{border:1px solid #9aa7b8;padding:6px;font-size:9px;white-space:normal}" +
  "th{background:#071b3a;color:white}.module{display:block !important}.toolbar{display:none}" +
  ".cards{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:14px}" +
  ".card{border:1px solid #c5ced9;padding:9px;border-left:4px solid #1769ff}.card .label{font-size:9px;color:#5d6b7d}" +
  ".card .value{font-size:17px;font-weight:bold;color:#071b3a}.badge{padding:2px 6px;border-radius:8px;font-size:9px}" +
  ".badge.ok{background:#e8f5e9;color:#2e7d32}.badge.warn{background:#fff3e0;color:#ef6c00}" +
  ".badge.danger{background:#ffebee;color:#c62828}.badge.info{background:#e3f2fd;color:#1565c0}" +
  ".dashboard-hero,.scene-3d{display:none}";

export const PRINT_CSS_BON =
  "@page{size:A4;margin:10mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}" +
  "body{font-family:Arial,sans-serif;color:#111;margin:0}.print-bon{padding:10px}.print-bon h2{font-size:20px}" +
  ".print-bon .info-box{border:1px solid #333;padding:10px;margin:10px 0}" +
  ".print-bon .signatures{display:flex;justify-content:space-between;margin-top:60px}" +
  ".print-bon .sign-box{width:45%;border-top:1px solid #333;padding-top:5px;text-align:center}" +
  ".print-bon .total-row{background:#f0f0f0;font-weight:bold}";

/** Clone a rendered node, stripping interactive controls, and return its inner HTML. */
export function preparePrintable(node: HTMLElement | null): string {
  if (!node) return "";
  const clone = node.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("input, select, textarea, button, .no-print").forEach((x) => x.remove());
  return clone.innerHTML;
}

export interface PrintOptions {
  css?: string;
  width?: number;
  height?: number;
}

/** Open a print popup with the given body HTML. Returns false if pop-ups are blocked. */
export function printHtml(bodyHtml: string, title: string, options: PrintOptions = {}): boolean {
  if (typeof window === "undefined") return false;
  const { css = PRINT_CSS_MODULE, width = 1280, height = 860 } = options;
  const win = window.open("", "_blank", `width=${width},height=${height}`);
  if (!win) return false;
  win.document.open();
  win.document.write(
    `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>ANEP - ${title}</title><style>${css}</style></head><body>${bodyHtml}</body></html>`,
  );
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 350);
  return true;
}
