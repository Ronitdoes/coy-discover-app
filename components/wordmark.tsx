interface WordmarkProps {
  /** Font-size utilities control the mark's size; the pink dot scales with it. */
  className?: string;
}

/**
 * The lowercase "coy." wordmark. The period is a pink dot rather than a glyph,
 * matching the app icon and the rest of the brand system.
 */
export function Wordmark({ className = "" }: WordmarkProps) {
  return (
    <span
      className={`inline-flex items-end font-black leading-none tracking-[-0.065em] text-ink ${className}`}
    >
      <span>coy</span>
      <span
        aria-hidden
        className="mb-[0.14em] ml-[0.04em] inline-block h-[0.23em] w-[0.23em] rounded-full bg-coy-pink"
      />
    </span>
  );
}
