"use client";

/**
 * A full document navigation (rather than a client-side transition) so the
 * service worker can serve the cached app shell when the network is back.
 */
export function OfflineRetryButton() {
  return (
    <button
      type="button"
      onClick={() => {
        // Intentional hard navigation: the service worker must serve the
        // cached app shell without React Router intercepting it.
        window.location.replace("/");
      }}
      className="coy-btn mt-6 bg-coy-pink px-6 py-3 text-[14px] text-white hover:bg-coy-pink-dark"
    >
      Try again
    </button>
  );
}
