"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  as?: "a";
  href?: string;
}

const base =
  "inline-flex items-center justify-center rounded-control font-medium transition-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";

const variants = {
  primary:
    "bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-active focus-visible:ring-primary",
  outline:
    "border border-control-border bg-surface hover:bg-surface-elevated text-text-primary focus-visible:ring-primary",
  ghost:
    "bg-transparent text-text-secondary hover:bg-surface-elevated hover:text-text-primary focus-visible:ring-border-subtle",
  danger:
    "bg-error-bg text-error-fg hover:bg-error-fg hover:text-on-error focus-visible:ring-error-fg",
};

const sizes = {
  sm: "min-h-8 px-3 text-xs",
  md: "min-h-10 px-4 text-sm",
  lg: "min-h-12 px-6 text-base",
};

function Spinner({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2">
      <svg
        className="animate-spin h-4 w-4"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      {children}
    </span>
  );
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  isLoading = false,
  disabled,
  children,
  as,
  href,
  ...props
}: ButtonProps) {
  const cls = [
    base,
    variants[variant as keyof typeof variants],
    sizes[size as keyof typeof sizes],
    isLoading && "opacity-70 cursor-not-allowed",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const content = isLoading ? <Spinner>{children}</Spinner> : children;

  if (as === "a" && href) {
    return (
      <Link href={href as Route} className={cls}>
        {content}
      </Link>
    );
  }

  return (
    <button className={cls} disabled={disabled || isLoading} {...props}>
      {content}
    </button>
  );
}
