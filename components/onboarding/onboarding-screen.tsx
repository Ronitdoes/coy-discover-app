import { HeartFilledIcon } from "@/components/icons";
import { Wordmark } from "@/components/wordmark";

import { GetStartedButton } from "./get-started-button";
import { MatchStack } from "./match-stack";

interface OnboardingScreenProps {
  onGetStarted: () => void;
}

export function OnboardingScreen({ onGetStarted }: OnboardingScreenProps) {
  return (
    <section
      aria-labelledby="onboarding-title"
      className="relative flex h-full min-h-0 flex-col overflow-hidden bg-white"
    >
      <div aria-hidden className="coy-onboarding-grid absolute inset-0" />

      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-28 -top-28 h-72 w-72 rounded-full bg-lavender/75 blur-3xl" />
        <div className="absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-blush/80 blur-3xl" />
        <div className="absolute -right-20 bottom-20 h-48 w-48 rounded-full bg-mint/60 blur-3xl" />
      </div>

      <header className="relative z-10 flex shrink-0 items-center justify-between px-6 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <Wordmark className="text-[30px]" />
        <span
          aria-hidden
          className="flex h-9 w-9 rotate-6 items-center justify-center rounded-full border-2 border-ink bg-blush shadow-[2px_2px_0_0_var(--color-ink)]"
        >
          <HeartFilledIcon className="h-4 w-4 text-coy-pink" />
        </span>
      </header>

      <div className="relative z-10 mt-5 shrink-0 px-6">
        <h1
          id="onboarding-title"
          className="animate-onboarding-rise text-[clamp(2.1rem,10.2vw,2.6rem)] font-black leading-[1.02] tracking-[-0.055em] text-ink"
          style={{ animationDelay: "60ms" }}
        >
          Your Perfect
          <br />
          Match is Just a
          <br />
          Swipe{" "}
          <span className="inline-block -rotate-2 rounded-[0.1em] bg-coy-pink px-[0.16em] pb-[0.04em] text-white shadow-[0.08em_0.08em_0_0_var(--color-ink)]">
            Away
          </span>
        </h1>
      </div>

      <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center px-5 py-1">
        <div className="relative w-[min(100%,340px,44dvh)]">
          <svg
            viewBox="0 0 110 120"
            fill="none"
            aria-hidden
            className="pointer-events-none absolute right-[1%] top-[-7%] z-20 w-[31%] text-ink"
          >
            <path
              pathLength={1}
              d="M14 10C64 10 94 42 66 92"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              className="coy-onboarding-arrow-line"
            />
            <path
              d="M67 72 66 93 83 81"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="coy-onboarding-arrow-head"
            />
          </svg>

          <MatchStack />
        </div>
      </div>

      <footer className="relative z-10 shrink-0 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div
          className="animate-onboarding-rise mx-auto w-full max-w-[340px]"
          style={{ animationDelay: "460ms" }}
        >
          <p className="flex items-center justify-center gap-1.5 text-center text-[12px] font-semibold text-smoke">
            <HeartFilledIcon aria-hidden className="h-3 w-3 text-coy-pink" />
            Likes stay private until they&rsquo;re mutual.
          </p>

          <GetStartedButton className="mt-3.5" onGetStarted={onGetStarted} />

          <p
            aria-hidden
            className="mt-2.5 text-center text-[9px] font-extrabold uppercase tracking-[0.2em] text-smoke/80"
          >
            Swipe right or tap
          </p>
        </div>
      </footer>
    </section>
  );
}
