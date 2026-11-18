"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

/** The non-standard Chromium event that backs the native install prompt. */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }

  interface Navigator {
    /** iOS Safari exposes this instead of a display-mode media query. */
    standalone?: boolean;
  }
}

export type InstallPlatform =
  | "checking"
  | "ios"
  | "safari"
  | "firefox"
  | "chromium"
  | "other";

export type InstallOutcome = "accepted" | "dismissed" | "unavailable";

export interface InstallController {
  /** True when Chromium has given us a deferred prompt to fire. */
  canPrompt: boolean;
  /** True when the app is already running from the home screen. */
  isStandalone: boolean;
  platform: InstallPlatform;
  promptInstall: () => Promise<InstallOutcome>;
}

function isStandaloneDisplay() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    navigator.standalone === true
  );
}

function subscribeToStandalone(onStoreChange: () => void) {
  const displayMode = window.matchMedia("(display-mode: standalone)");
  displayMode.addEventListener("change", onStoreChange);
  window.addEventListener("appinstalled", onStoreChange);

  return () => {
    displayMode.removeEventListener("change", onStoreChange);
    window.removeEventListener("appinstalled", onStoreChange);
  };
}

function detectPlatform(): Exclude<InstallPlatform, "checking"> {
  const ua = navigator.userAgent;
  const isIos =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  if (isIos) return "ios";
  if (/Firefox|FxiOS/i.test(ua)) return "firefox";
  if (/Safari/i.test(ua) && !/Chrome|Chromium|Edg|OPR|Android/i.test(ua)) {
    return "safari";
  }
  if (/Chrome|Chromium|Edg|OPR|SamsungBrowser/i.test(ua)) return "chromium";
  return "other";
}

/**
 * Lives at the app-shell level so the Chromium install event is captured even
 * while the user is on another tab. Discover only renders the UI for it.
 */
export function useInstallPrompt(): InstallController {
  const [promptEvent, setPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const isStandalone = useSyncExternalStore(
    subscribeToStandalone,
    isStandaloneDisplay,
    () => false,
  );
  const platform: InstallPlatform =
    typeof window === "undefined" ? "checking" : detectPlatform();

  useEffect(() => {
    function handleBeforeInstall(event: BeforeInstallPromptEvent) {
      // Keep the browser's mini-infobar out of the way; our own download
      // button calls event.prompt() when the user taps "Add".
      event.preventDefault();
      setPromptEvent(event);
    }

    function handleInstalled() {
      setPromptEvent(null);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<InstallOutcome> => {
    if (!promptEvent) return "unavailable";

    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      setPromptEvent(null);
      return choice.outcome;
    } catch {
      setPromptEvent(null);
      return "unavailable";
    }
  }, [promptEvent]);

  return { canPrompt: promptEvent !== null, isStandalone, platform, promptInstall };
}
