"use client";

import { useEffect, useState } from "react";

import {
  CheckIcon,
  DownloadIcon,
  ShareIcon,
  XIcon,
} from "@/components/icons";
import type {
  InstallController,
  InstallPlatform,
} from "@/components/install/use-install-prompt";

interface InstallBannerProps {
  install: InstallController;
  onClose: () => void;
}

function InstallHelp({ platform }: { platform: InstallPlatform }) {
  if (platform === "ios") {
    return (
      <>
        Tap the{" "}
        <span className="inline-flex items-center gap-1 rounded-md border border-ink/15 bg-white px-1.5 py-0.5 align-middle text-[10px] font-extrabold text-ink">
          <ShareIcon className="h-3 w-3" strokeWidth={2.4} />
          Share
        </span>{" "}
        button in Safari, then choose{" "}
        <strong className="font-extrabold text-ink">Add to Home Screen</strong>.
      </>
    );
  }

  if (platform === "safari") {
    return (
      <>
        Open Safari&rsquo;s Share menu, then choose{" "}
        <strong className="font-extrabold text-ink">
          Add to Dock or Add to Home Screen
        </strong>
        .
      </>
    );
  }

  if (platform === "firefox") {
    return (
      <>
        Firefox can&rsquo;t install web apps. Open Coy in Chrome, Edge, or
        Safari to add it to your home screen.
      </>
    );
  }

  if (platform === "chromium") {
    return (
      <>
        Open the browser menu and choose{" "}
        <strong className="font-extrabold text-ink">Install app</strong>, or use
        your browser&rsquo;s <strong className="font-extrabold text-ink">Add to Home screen</strong>{" "}
        action.
      </>
    );
  }

  return (
    <>
      Open your browser&rsquo;s menu and choose{" "}
      <strong className="font-extrabold text-ink">
        Install app or Add to Home screen
      </strong>
      .
    </>
  );
}

/**
 * The dismissible card shown from the home icon in Discover. It mirrors the
 * browser's install prompt: a real native prompt on Chromium, and clear
 * step-by-step guidance on iOS and browsers without one.
 */
export function InstallBanner({ install, onClose }: InstallBannerProps) {
  const [showHelp, setShowHelp] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);
  const [busy, setBusy] = useState(false);

  const isInstalled = justInstalled || install.isStandalone;

  useEffect(() => {
    if (!isInstalled) return;

    const timer = window.setTimeout(onClose, 3600);
    return () => window.clearTimeout(timer);
  }, [isInstalled, onClose]);

  async function handleAdd() {
    if (busy) return;

    if (!install.canPrompt) {
      setShowHelp(true);
      return;
    }

    setBusy(true);
    const outcome = await install.promptInstall();
    setBusy(false);

    if (outcome === "accepted") {
      setJustInstalled(true);
    } else if (outcome === "dismissed") {
      onClose();
    } else {
      setShowHelp(true);
    }
  }

  return (
    <section
      id="install-banner"
      aria-label="Add Coy to your home screen"
      className="shrink-0 px-5 pb-2.5"
    >
      <div className="coy-card-sm animate-install-pop bg-white px-2.5 py-2.5">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] border-2 border-ink/10 bg-sky text-ink"
          >
            {isInstalled ? (
              <CheckIcon className="h-5 w-5 text-coy-pink" strokeWidth={3} />
            ) : (
              <DownloadIcon className="h-5 w-5" strokeWidth={2.2} />
            )}
          </span>

          <div className="min-w-0 flex-1">
            <p
              role={isInstalled ? "status" : undefined}
              className="text-[13px] font-extrabold leading-tight tracking-[-0.01em] text-ink"
            >
              {isInstalled
                ? "Coy is ready on your home screen"
                : "Add Coy to your home screen"}
            </p>
            <p className="mt-0.5 text-[11px] font-semibold leading-snug text-smoke">
              Open it like an app, in one tap.
            </p>
          </div>

          {!isInstalled ? (
            <button
              type="button"
              onClick={handleAdd}
              disabled={busy}
              className="shrink-0 px-1 py-1 text-[13px] font-extrabold text-coy-pink transition-colors hover:text-coy-pink-dark disabled:opacity-50"
            >
              {busy ? "Adding…" : "Add"}
            </button>
          ) : null}

          <button
            type="button"
            onClick={onClose}
            aria-label="Dismiss add to home screen"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-lavender-soft text-ink transition-colors hover:bg-blush"
          >
            <XIcon className="h-4 w-4" strokeWidth={2.6} />
          </button>
        </div>

        {showHelp && !isInstalled ? (
          <p
            role="status"
            className="mt-2.5 rounded-xl border border-ink/10 bg-lavender-soft px-2.5 py-2 text-[11px] font-semibold leading-relaxed text-ink/70"
          >
            <InstallHelp platform={install.platform} />
          </p>
        ) : null}
      </div>
    </section>
  );
}
