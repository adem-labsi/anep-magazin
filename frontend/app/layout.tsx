import "./globals.css";
import type { Metadata } from "next";
import ErrorBoundary from "@/components/ErrorBoundary";

export const metadata: Metadata = {
  title: "ANEP - Gestion du Magasin",
  description: "Migré vers Next.js + Django + PostgreSQL",
};

const PREPAINT_SCRIPT = `try{var t=localStorage.getItem('ANEP_THEME');if(t==='dark'){document.body.classList.add('dark')}var l=localStorage.getItem('ANEP_LANG');if(l==='ar'){document.documentElement.lang='ar';document.documentElement.dir='rtl';document.body.classList.add('rtl');document.body.style.direction='rtl'}}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: PREPAINT_SCRIPT }} />
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
    </html>
  );
}
