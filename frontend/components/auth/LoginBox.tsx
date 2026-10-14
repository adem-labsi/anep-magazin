"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { t } from "@/lib/i18n";
import { ANEP_LOGO_DATA_URL } from "@/lib/logo";
import type { Lang } from "@/lib/types";

export interface LoginBoxProps {
  lang: Lang;
  onLogin: (username: string, password: string) => void;
}

export function LoginBox({ lang, onLogin }: LoginBoxProps) {
  const [u, setU] = useState("");
  const [p, setP] = useState("");

  return (
    <div id="loginScreen">
      <div className="login-box">
        <img src={ANEP_LOGO_DATA_URL} className="logo-login" alt="ANEP" />
        <h2>{t(lang, "loginTitle")}</h2>
        <div className="subtitle">{t(lang, "loginSubtitle")}</div>
        <div className="form-group">
          <input value={u} onChange={(e) => setU(e.target.value)} placeholder={t(lang, "loginUser")} />
        </div>
        <div className="form-group">
          <input
            type="password"
            value={p}
            onChange={(e) => setP(e.target.value)}
            placeholder={t(lang, "loginPass")}
            onKeyDown={(e) => { if (e.key === "Enter") onLogin(u, p); }}
          />
        </div>
        <Button onClick={() => onLogin(u, p)}>{t(lang, "loginBtn")}</Button>
      </div>
    </div>
  );
}
