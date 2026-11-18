import type { CSSProperties } from "react";

import { Avatar } from "@/components/avatar";

/* ---------------------------------------------------------------------------
   The "match constellation" from the onboarding art: real profiles orbiting a
   pair of mystery "?" bubbles. Coordinates are percentages of a 340 × 375
   canvas so the whole cluster scales as one piece.
--------------------------------------------------------------------------- */

interface BubblePosition {
  left: string;
  top: string;
  width: string;
}

interface PhotoBubble {
  kind: "photo";
  src: string;
  name: string;
  position: BubblePosition;
  z: number;
  delay: number;
}

interface QuestionBubble {
  kind: "question";
  tone: "lavender" | "blush";
  position: BubblePosition;
  z: number;
  delay: number;
}

type Bubble = PhotoBubble | QuestionBubble;

const BUBBLES: Bubble[] = [
  {
    kind: "photo",
    src: "/photos/p09.jpg",
    name: "Chloe",
    position: { left: "20.3%", top: "12.8%", width: "30%" },
    z: 10,
    delay: 80,
  },
  {
    kind: "question",
    tone: "lavender",
    position: { left: "53%", top: "19.5%", width: "32.4%" },
    z: 30,
    delay: 160,
  },
  {
    kind: "photo",
    src: "/photos/p07.jpg",
    name: "Amara",
    position: { left: "11.2%", top: "41.3%", width: "29.4%" },
    z: 10,
    delay: 240,
  },
  {
    kind: "photo",
    src: "/photos/p01.jpg",
    name: "Maya",
    position: { left: "37.6%", top: "43.5%", width: "33.5%" },
    z: 20,
    delay: 320,
  },
  {
    kind: "photo",
    src: "/photos/p05.jpg",
    name: "Sofia",
    position: { left: "63.8%", top: "42.4%", width: "31.2%" },
    z: 30,
    delay: 400,
  },
  {
    kind: "question",
    tone: "blush",
    position: { left: "28.5%", top: "66.7%", width: "32.4%" },
    z: 30,
    delay: 480,
  },
  {
    kind: "photo",
    src: "/photos/p03.jpg",
    name: "Priya",
    position: { left: "60.3%", top: "72.5%", width: "29.4%" },
    z: 20,
    delay: 560,
  },
];

function bubbleStyle(bubble: Bubble): CSSProperties {
  return {
    left: bubble.position.left,
    top: bubble.position.top,
    width: bubble.position.width,
    zIndex: bubble.z,
    animationDelay: `${bubble.delay}ms`,
  };
}

const QUESTION_TONES = {
  lavender: "bg-lavender",
  blush: "bg-blush",
} as const;

export function MatchStack() {
  return (
    <div className="relative aspect-[340/375] w-full" aria-hidden>
      {BUBBLES.map((bubble) =>
        bubble.kind === "photo" ? (
          <div
            key={bubble.name}
            className="animate-onboarding-bubble absolute"
            style={bubbleStyle(bubble)}
          >
            <div className="aspect-square w-full rounded-full border-2 border-ink bg-white p-1 shadow-[4px_4px_0_0_var(--color-ink)]">
              <Avatar
                src={bubble.src}
                name={bubble.name}
                className="h-full w-full rounded-full object-cover"
                fallbackTextClassName="text-2xl"
              />
            </div>
          </div>
        ) : (
          <div
            key={bubble.tone}
            className="animate-onboarding-bubble absolute"
            style={bubbleStyle(bubble)}
          >
            <div className="aspect-square w-full rounded-full border-2 border-ink bg-white p-1 shadow-[4px_4px_0_0_var(--color-ink)]">
              <div
                className={`flex h-full w-full items-center justify-center rounded-full ${QUESTION_TONES[bubble.tone]}`}
              >
                <span className="-translate-y-px text-[clamp(2.1rem,10.5vw,2.75rem)] font-black leading-none tracking-[-0.04em] text-ink">
                  ?
                </span>
              </div>
            </div>
          </div>
        ),
      )}

      {/* Tiny brand sparkles tucked into the gaps of the cluster. */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="absolute left-0 top-[2%] h-[7%] w-auto text-coy-pink"
        aria-hidden
      >
        <path
          d="M12 1.5c.7 5.6 3.4 8.3 9 9-5.6.7-8.3 3.4-9 9-.7-5.6-3.4-8.3-9-9 5.6-.7 8.3-3.4 9-9Z"
          fill="currentColor"
        />
      </svg>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="absolute bottom-[9%] right-[2%] h-[5%] w-auto text-ink/30"
        aria-hidden
      >
        <path
          d="M12 1.5c.7 5.6 3.4 8.3 9 9-5.6.7-8.3 3.4-9 9-.7-5.6-3.4-8.3-9-9 5.6-.7 8.3-3.4 9-9Z"
          fill="currentColor"
        />
      </svg>
    </div>
  );
}
