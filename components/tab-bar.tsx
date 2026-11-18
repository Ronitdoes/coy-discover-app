"use client";

import { HeartFilledIcon, HomeIcon } from "@/components/icons";

export type Tab = "home" | "discover";

interface TabBarProps {
  active: Tab;
  onChange: (tab: Tab) => void;
}

const TABS: Array<{ id: Tab; label: string; Icon: typeof HomeIcon }> = [
  { id: "home", label: "Home", Icon: HomeIcon },
  { id: "discover", label: "Discover", Icon: HeartFilledIcon },
];

export function TabBar({ active, onChange }: TabBarProps) {
  return (
    <nav
      aria-label="Main"
      className="relative z-30 shrink-0 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2"
    >
      <ul className="mx-auto grid w-full max-w-[400px] grid-cols-2 gap-1 rounded-full border-2 border-ink bg-white p-1 shadow-[4px_4px_0_0_var(--color-ink)]">
        {TABS.map(({ id, label, Icon }) => {
          const isActive = id === active;
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => onChange(id)}
                aria-current={isActive ? "page" : undefined}
                className={`flex h-11 w-full items-center justify-center gap-2 rounded-full border-2 text-[13px] font-extrabold transition-colors ${
                  isActive
                    ? "border-ink bg-coy-pink text-white"
                    : "border-transparent text-smoke hover:bg-lavender-soft hover:text-ink"
                }`}
              >
                <Icon
                  className={`h-5 w-5 ${isActive ? "text-white" : "text-ink/45"}`}
                  strokeWidth={isActive ? 2.4 : 2}
                />
                {label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
