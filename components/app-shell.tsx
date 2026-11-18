"use client";

import { useState } from "react";

import { DiscoverTab } from "@/components/discover/discover-tab";
import { HomeTab } from "@/components/home-tab";
import { TabBar, type Tab } from "@/components/tab-bar";

export function AppShell() {
  // Discover is the default so the feature is visible immediately; Home stays
  // one tap away as the blank placeholder for Coy's existing experience.
  const [tab, setTab] = useState<Tab>("discover");

  return (
    <div className="flex min-h-dvh justify-center bg-stone-100 sm:items-center sm:p-6">
      <div className="relative flex h-dvh w-full max-w-md flex-col overflow-hidden bg-white sm:h-[calc(100dvh-3rem)] sm:max-h-[900px] sm:rounded-[2.25rem] sm:shadow-2xl sm:ring-1 sm:ring-stone-900/10">
        <main className="relative min-h-0 flex-1 overflow-hidden">
          {tab === "home" ? <HomeTab /> : <DiscoverTab />}
        </main>
        <TabBar active={tab} onChange={setTab} />
      </div>
    </div>
  );
}