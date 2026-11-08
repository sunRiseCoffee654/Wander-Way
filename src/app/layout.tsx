import type { Metadata, Viewport } from "next";
import { Roboto_Flex } from "next/font/google";
import type { ReactNode } from "react";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import "./globals.css";

const robotoFlex = Roboto_Flex({
  subsets: ["latin"],
  variable: "--font-roboto-flex",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "WanderWay — Material 3 Travel Companion",
    template: "%s — WanderWay",
  },
  description:
    "Shape your days, check the details, and keep the plan close. WanderWay is a deterministic travel planner with visible sources, honest pricing tiers, and real coordinates.",
  applicationName: "WanderWay",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f9f9ff" },
    { media: "(prefers-color-scheme: dark)", color: "#181c22" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={robotoFlex.variable}>
      <head>
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
      </head>
      <body className="bg-surface font-sans text-on-surface antialiased">
        <ServiceWorkerRegister />
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
