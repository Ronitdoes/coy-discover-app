"use client";

import { useEffect } from "react";

/**
 * Registers the service worker that makes Coy installable and keeps the app
 * shell available when the network drops. Registration is progressive
 * enhancement: if it fails the app still works normally online.
 */
export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    function register() {
      void navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => {
          // No service worker means no install prompt/offline shell, but the
          // live app is unaffected.
        });
    }

    if (document.readyState === "complete") {
      register();
      return;
    }

    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
