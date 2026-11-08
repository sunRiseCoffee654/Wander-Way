"use client";

import { useEffect } from "react";

/**
 * Client component to register the WanderWay PWA Service Worker.
 * Follows PWA best practices: registers after window load to prevent blocking initial paints.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      const handleLoad = () => {
        navigator.serviceWorker
          .register("/sw.js")
          .catch((err) => {
            console.warn("[sw] Registration failed:", err);
          });
      };

      if (document.readyState === "complete") {
        handleLoad();
      } else {
        window.addEventListener("load", handleLoad);
        return () => window.removeEventListener("load", handleLoad);
      }
    }
  }, []);

  return null;
}