import { useId, useState, type ReactNode } from "react";
import Icon from "./Icon";

type Props = { label: string; hideLabel?: string; children: ReactNode };

// Details stay hidden until the person asks for them. Styled like a Health list row with a chevron.
export default function Reveal({ label, hideLabel = "Hide", children }: Props) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="space-y-3">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="card w-full min-h-[3.4rem] px-5 py-4 flex items-center justify-between text-left text-lg font-medium text-ink focus-ring hover:bg-raised"
      >
        <span>{open ? hideLabel : label}</span>
        <Icon name="chevron" className={`h-5 w-5 text-ink-3 transition-transform ${open ? "rotate-90" : ""}`} strokeWidth={2.5} />
      </button>
      {open && <div id={id} className="space-y-3">{children}</div>}
    </div>
  );
}
