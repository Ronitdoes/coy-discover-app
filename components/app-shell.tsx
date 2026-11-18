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
    <div className="flex h-dvh justify-center overflow-hidden bg-white text-ink">
      <div className="flex h-full w-full max-w-[620px] flex-col">
        <main className="relative min-h-0 flex-1 overflow-hidden">
          {tab === "home" ? <HomeTab /> : <DiscoverTab />}
        </main>
        <TabBar active={tab} onChange={setTab} />
      </div>
    </div>
  );
}
