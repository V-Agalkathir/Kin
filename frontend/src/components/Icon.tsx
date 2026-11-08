// Small stroke icon set (24px grid, currentColor). Keep shapes simple and friendly.
export type IconName =
  | "stand" | "speech" | "pause" | "shield" | "check" | "chevron" | "alert" | "mic" | "home" | "heart" | "bell"
  | "phone" | "steps" | "moon" | "gauge" | "clipboard" | "pin" | "clock" | "sparkle" | "users";

const PATHS: Record<IconName, JSX.Element> = {
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
  phone: (<path d="M6.5 3.5h3l1.5 4.5-2 1.5a11 11 0 0 0 5.5 5.5l1.5-2 4.5 1.5v3a2 2 0 0 1-2 2A16.5 16.5 0 0 1 4.5 5.5a2 2 0 0 1 2-2Z" />),
  steps: (<><path d="M8 3.5c1.7 0 2.5 1.8 2.5 4S9.8 12 8 12s-2.5-2.3-2.5-4.5S6.3 3.5 8 3.5ZM6 14.5h4l-.3 2.5a1.7 1.7 0 0 1-3.4 0L6 14.5Z" /><path d="M16 7.5c1.7 0 2.5 1.8 2.5 4S17.8 16 16 16s-2.5-2.3-2.5-4.5.8-4 2.5-4ZM14 18.5h4l-.3 1.5a1.7 1.7 0 0 1-3.4 0l-.3-1.5Z" /></>),
  moon: (<path d="M19.5 14.5A7.5 7.5 0 0 1 9.5 4.5a7.5 7.5 0 1 0 10 10Z" />),
  gauge: (<><path d="M4 16a8 8 0 1 1 16 0" /><path d="m12 16 4-5" /><circle cx="12" cy="16" r="1" /></>),
  clipboard: (<><rect x="5" y="4.5" width="14" height="16.5" rx="2" /><path d="M9 4.5V3.5h6v1M9 10h6M9 14h6M9 18h3" /></>),
  pin: (<><path d="M12 21s6.5-6 6.5-11a6.5 6.5 0 0 0-13 0c0 5 6.5 11 6.5 11Z" /><circle cx="12" cy="10" r="2.2" /></>),
  clock: (<><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>),
  sparkle: (<path d="M12 3.5 13.8 10l6.7 2-6.7 2L12 20.5 10.2 14l-6.7-2 6.7-2L12 3.5Z" />),
  users: (<><circle cx="9" cy="8" r="3.2" /><path d="M3 19.5c.6-3.3 3-5 6-5s5.4 1.7 6 5" /><circle cx="17" cy="9" r="2.5" /><path d="M16 14.6c2.6.1 4.4 1.6 5 4.4" /></>),
};

export default function Icon({ name, className = "h-6 w-6", strokeWidth = 2 }: { name: IconName; className?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      {PATHS[name]}
    </svg>
  );
}

/** Coloured category label like Health's "♥ Heart" headers. */
export function CategoryLabel({ icon, label, color }: { icon: IconName; label: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-[0.9rem] font-semibold" style={{ color }}>
      <Icon name={icon} className="h-[1.1rem] w-[1.1rem]" strokeWidth={2.4} />
      {label}
    </span>
  );
}
