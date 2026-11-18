"use client";

import { Avatar } from "@/components/avatar";
import { HeartFilledIcon, MapPinIcon, XIcon } from "@/components/icons";
import type { Profile } from "@/lib/types";

interface SwipeCardProps {
  profile: Profile;
  /** Live drag offset in px; fades the LIKE / NOPE stamps as you drag. */
  dragX?: number;
  /** Set on ghost cards to show a committed stamp at full opacity. */
  stamp?: "like" | "pass";
}

const PROFILE_TONES = ["bg-lavender", "bg-mint", "bg-blush"] as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function toneFor(id: string) {
  const number = Number.parseInt(id.replace(/\D/g, ""), 10);
  const index = Number.isFinite(number) ? Math.max(0, number - 1) : 0;
  return PROFILE_TONES[index % PROFILE_TONES.length];
}

export function SwipeCard({ profile, dragX = 0, stamp }: SwipeCardProps) {
  const likeOpacity = stamp === "like" ? 1 : clamp(dragX / 110, 0, 1);
  const passOpacity = stamp === "pass" ? 1 : clamp(-dragX / 110, 0, 1);

  return (
    <article
      aria-label={`${profile.name}, ${profile.age}, ${profile.city}`}
      className={`coy-card relative flex h-full w-full select-none flex-col overflow-hidden ${toneFor(profile.id)}`}
    >
      <div className="relative min-h-0 flex-1 p-3 pb-0">
        <div className="relative h-full w-full overflow-hidden rounded-[20px] border-2 border-ink bg-gradient-to-br from-lavender via-blush to-mint">
          <Avatar
            src={profile.photo}
            name={profile.name}
            className="h-full w-full object-cover"
            fallbackTextClassName="text-7xl"
          />

          <div
            aria-hidden
            className="pointer-events-none absolute left-3 top-4 flex -rotate-12 items-center gap-1.5 rounded-xl border-[3px] border-ink bg-white px-3 py-1 text-[17px] font-black uppercase tracking-[0.08em] text-coy-pink shadow-[3px_3px_0_0_var(--color-ink)]"
            style={{ opacity: likeOpacity }}
          >
            <HeartFilledIcon className="h-4 w-4" />
            Like
          </div>

          <div
            aria-hidden
            className="pointer-events-none absolute right-3 top-4 flex rotate-12 items-center gap-1.5 rounded-xl border-[3px] border-ink bg-white px-3 py-1 text-[17px] font-black uppercase tracking-[0.08em] text-ink shadow-[3px_3px_0_0_var(--color-ink)]"
            style={{ opacity: passOpacity }}
          >
            <XIcon className="h-4 w-4" strokeWidth={3} />
            Nope
          </div>
        </div>
      </div>

      <div className="shrink-0 px-5 pb-4 pt-3">
        <div className="flex min-w-0 items-baseline gap-1">
          <h2 className="min-w-0 truncate text-[28px] font-black leading-none tracking-[-0.045em] text-ink">
            {profile.name}
            <span aria-hidden>,</span>
          </h2>
          <span className="shrink-0 text-[20px] font-bold leading-none text-ink/40">
            {profile.age}
          </span>
        </div>

        <p className="mt-1.5 flex min-w-0 items-center gap-1 text-[12px] font-semibold text-ink/60">
          <MapPinIcon className="h-3.5 w-3.5 shrink-0 text-coy-pink" />
          <span className="truncate">
            {profile.city}
            {profile.college ? ` · ${profile.college}` : ""}
          </span>
        </p>

        <p className="mt-2 line-clamp-2 text-[13px] font-medium leading-[1.45] text-ink/70">
          {profile.bio}
        </p>

        <ul className="mt-2.5 flex flex-wrap gap-1.5">
          {profile.interests.slice(0, 4).map((interest) => (
            <li
              key={interest}
              className="rounded-full border border-ink bg-white/75 px-2.5 py-0.5 text-[10px] font-extrabold leading-tight text-ink"
            >
              {interest}
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
