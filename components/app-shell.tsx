"use client";

import { useCallback, useState, useSyncExternalStore } from "react";

import { DiscoverTab } from "@/components/discover/discover-tab";
import { HomeTab } from "@/components/home-tab";
import { useInstallPrompt } from "@/components/install/use-install-prompt";
import { OnboardingScreen } from "@/components/onboarding/onboarding-screen";
import { TabBar, type Tab } from "@/components/tab-bar";

const ONBOARDING_KEY = "coy:onboarding-complete";

function subscribeToStorage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function hasCompletedOnboarding() {
  try {
    return window.localStorage.getItem(ONBOARDING_KEY) === "true";
  } catch {
    return false;
  }
}

function getServerOnboardingSnapshot() {
  return false;
}

export function AppShell() {
  // localStorage is the source of truth so returning visitors skip the intro.
  // A local flag covers this visit even where storage is unavailable.
  const storedComplete = useSyncExternalStore(
    subscribeToStorage,
    hasCompletedOnboarding,
    getServerOnboardingSnapshot,
  );
  const [completedThisVisit, setCompletedThisVisit] = useState(false);
  const showOnboarding = !storedComplete && !completedThisVisit;
  // Discover is the default so the feature is visible immediately; Home stays
  // one tap away as the blank placeholder for Coy's existing experience.
  const [tab, setTab] = useState<Tab>("discover");
  // Captured at the shell level so the Chromium install event is not missed
  // while Discover is unmounted on the Home tab.
  const install = useInstallPrompt();

  const completeOnboarding = useCallback(() => {
    try {
      window.localStorage.setItem(ONBOARDING_KEY, "true");
    } catch {
      // Not fatal — the onboarding still completes for this visit.
    }
    setCompletedThisVisit(true);
  }, []);

  return (
    <div className="flex min-h-dvh items-start justify-center bg-white text-ink">
      <div className="flex h-dvh w-full max-w-[390px] flex-col overflow-hidden">
        {showOnboarding ? (
          <OnboardingScreen onGetStarted={completeOnboarding} />
        ) : (
          <>
            <main className="relative min-h-0 flex-1 overflow-hidden">
              {tab === "home" ? <HomeTab /> : <DiscoverTab install={install} />}
            </main>
            <TabBar active={tab} onChange={setTab} />
          </>
        )}
      </div>
    </div>
  );
}
