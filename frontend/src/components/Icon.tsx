// Small stroke icon set (24px grid, currentColor). Keep shapes simple and friendly.
type Name = "stand" | "speech" | "pause" | "shield" | "check" | "chevron" | "alert" | "mic" | "home" | "heart" | "bell";

const PATHS: Record<Name, JSX.Element> = {
  stand: (<><circle cx="12" cy="4.5" r="2" /><path d="M12 7.5v6.5M12 14l-3 6M12 14l3 6M7.5 10.5 12 9l4.5 1.5" /></>),
  speech: (<path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8l-4 3.5V17H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />),
  pause: (<path d="M4 12h2M8 8v8M12 5v14M16 9v6M20 12h0" />),
  shield: (<path d="M12 3 5 6v5.5c0 4.3 2.9 8 7 9.5 4.1-1.5 7-5.2 7-9.5V6l-7-3Z" />),
  check: (<path d="m5 12.5 4.5 4.5L19 7.5" />),
  chevron: (<path d="m9 6 6 6-6 6" />),
  alert: (<><path d="M12 8v5" /><circle cx="12" cy="16.5" r=".6" /><circle cx="12" cy="12" r="9" /></>),
  mic: (<><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" /></>),
  home: (<path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-8Z" />),
  heart: (<path d="M12 20s-7.5-4.6-7.5-10A4.2 4.2 0 0 1 12 7.5 4.2 4.2 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10Z" />),
  bell: (<path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16ZM10 20.5a2 2 0 0 0 4 0" />),
};

export default function Icon({ name, className = "h-6 w-6", strokeWidth = 2 }: { name: Name; className?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      {PATHS[name]}
    </svg>
  );
}

/** Coloured category label like Health's "♥ Heart" headers. */
export function CategoryLabel({ icon, label, color }: { icon: Name; label: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-lg font-semibold" style={{ color }}>
      <Icon name={icon} className="h-5 w-5" strokeWidth={2.4} />
      {label}
    </span>
  );
}
