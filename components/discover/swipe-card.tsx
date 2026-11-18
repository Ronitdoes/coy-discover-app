"use client";

import { Avatar } from "@/components/avatar";
import { MapPinIcon } from "@/components/icons";
import type { Profile } from "@/lib/types";

interface SwipeCardProps {
  profile: Profile;
  /** Live drag offset in px; fades the LIKE / NOPE stamps as you drag. */
  dragX?: number;
  /** Set on ghost cards to show a committed stamp at full opacity. */
  stamp?: "like" | "pass";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function SwipeCard({ profile, dragX = 0, stamp }: SwipeCardProps) {
  const likeOpacity = stamp === "like" ? 1 : clamp(dragX / 110, 0, 1);
  const passOpacity = stamp === "pass" ? 1 : clamp(-dragX / 110, 0, 1);

  return (
    <article
      aria-label={`${profile.name}, ${profile.age}, ${profile.city}`}
      className="relative h-full w-full select-none overflow-hidden rounded-[2rem] bg-stone-200 shadow-[0_20px_50px_-16px_rgba(28,25,23,0.5)]"
    >
      <Avatar
        src={profile.photo}
        name={profile.name}
        className="absolute inset-0 h-full w-full object-cover"
        fallbackTextClassName="text-7xl"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/25 to-stone-950/5" />

      <div className="absolute inset-x-0 bottom-0 p-5 text-white [text-shadow:0_1px_16px_rgba(0,0,0,0.35)]">
        <div className="flex items-end gap-2">
          <h2 className="text-[26px] font-semibold leading-none">
            {profile.name}
          </h2>
          <span className="pb-px text-xl font-light text-white/90">
            {profile.age}
          </span>
        </div>

        <p className="mt-1.5 flex items-center gap-1 text-[13px] text-white/80">
          <MapPinIcon className="h-3.5 w-3.5 shrink-0" />
          <span className="shrink-0">{profile.city}</span>
          {profile.college ? (
            <>
              <span className="px-0.5 text-white/50">·</span>
              <span className="min-w-0 truncate">{profile.college}</span>
            </>
          ) : null}
        </p>

        <p className="mt-2.5 line-clamp-3 text-sm leading-snug text-white/90">
          {profile.bio}
        </p>

        <ul className="mt-3 flex flex-wrap gap-1.5">
          {profile.interests.map((interest) => (
            <li
              key={interest}
              className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium text-white ring-1 ring-inset ring-white/25 backdrop-blur-sm"
            >
              {interest}
            </li>
          ))}
        </ul>
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute left-5 top-6 -rotate-12 rounded-xl border-[3px] border-emerald-400 px-3 py-1 text-2xl font-black uppercase tracking-widest text-emerald-400"
        style={{ opacity: likeOpacity }}
      >
        Like
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute right-5 top-6 rotate-12 rounded-xl border-[3px] border-rose-500 px-3 py-1 text-2xl font-black uppercase tracking-widest text-rose-500"
        style={{ opacity: passOpacity }}
      >
        Nope
      </div>
    </article>
  );
}