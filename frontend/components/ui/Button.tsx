"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "success" | "danger" | "warn";

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: "",
  secondary: "secondary",
  success: "success",
  danger: "danger",
  warn: "warn",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  small?: boolean;
  children: ReactNode;
}

export function Button({ variant = "primary", small, className, type = "button", children, ...props }: ButtonProps) {
  const classes = [
    "btn",
    VARIANT_CLASS[variant],
    small ? "small" : "",
    className || "",
  ].filter(Boolean).join(" ");
  return (
    <button type={type} className={classes} {...props}>
      {children}
    </button>
  );
}
