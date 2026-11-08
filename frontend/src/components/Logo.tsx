// kin — lowercase serif wordmark with a mark of two overlapping rings (two people, connected).
export default function Logo({ size = 30 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
        <circle cx="12" cy="16" r="8.5" fill="none" stroke="#FF7A4D" strokeWidth="3" />
        <circle cx="20" cy="16" r="8.5" fill="none" stroke="#F5F5F7" strokeWidth="3" strokeOpacity="0.9" />
      </svg>
      <span className="font-display text-[1.9rem] leading-none tracking-tight">kin</span>
    </span>
  );
}
