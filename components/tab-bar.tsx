"use client";

import { HomeIcon, SparklesIcon } from "@/components/icons";

export type Tab = "home" | "discover";

interface TabBarProps {
  active: Tab;
  onChange: (tab: Tab) => void;
}

const TABS: Array<{ id: Tab; label: string; Icon: typeof HomeIcon }> = [
  { id: "home", label: "Home", Icon: HomeIcon },
  { id: "discover", label: "Discover", Icon: SparklesIcon },
];

export function TabBar({ active, onChange }: TabBarProps) {
  return (
    <nav
      aria-label="Main"
      className="relative z-30 border-t border-stone-200/80 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="flex h-16 items-stretch justify-around px-4">
        {TABS.map(({ id, label, Icon }) => {
          const isActive = id === active;
          return (
            <li key={id} className="flex-1">
              <button
                type="button"
                onClick={() => onChange(id)}
                aria-current={isActive ? "page" : undefined}
                className={`flex h-full w-full flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-medium transition-colors ${
                  isActive
                    ? "text-rose-600"
                    : "text-stone-400 hover:text-stone-600"
                }`}
              >
                <span
                  className={`flex h-8 w-14 items-center justify-center rounded-full transition-colors ${
                    isActive ? "bg-rose-50" : "bg-transparent"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                {label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}