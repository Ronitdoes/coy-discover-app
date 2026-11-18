import type { Metadata } from "next";

import { OfflineRetryButton } from "@/components/offline-retry-button";
import { Wordmark } from "@/components/wordmark";

export const metadata: Metadata = {
  title: "Offline — Coy",
};

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-white px-5 py-10">
      <div className="coy-card w-full max-w-[400px] bg-lavender px-6 py-9 text-center">
        <Wordmark className="text-[31px]" />
        <span aria-hidden className="mt-6 block text-4xl">
          📡
        </span>
        <h1 className="mt-3 text-[26px] font-black leading-tight tracking-[-0.04em] text-ink">
          You&rsquo;re offline
        </h1>
        <p className="mx-auto mt-2 max-w-[19rem] text-[13px] font-medium leading-relaxed text-ink/60">
          Coy needs a connection to load profiles and save swipes. Reconnect and
          pick up right where you left off.
        </p>
        <OfflineRetryButton />
      </div>
    </main>
  );
}
