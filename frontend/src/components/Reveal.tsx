import { useId, useState, type ReactNode } from "react";

type Props = { label: string; hideLabel?: string; children: ReactNode };

// Details stay hidden until the person asks for them. Large, plain toggle.
export default function Reveal({ label, hideLabel = "Hide", children }: Props) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="space-y-4">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="w-full min-h-16 px-6 py-4 rounded-2xl text-xl font-semibold text-sky-900 bg-white border-2 border-stone-300
          hover:bg-stone-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-400 flex items-center justify-between"
      >
        <span>{open ? hideLabel : label}</span>
        <span aria-hidden className={`text-2xl transition-transform ${open ? "rotate-180" : ""}`}>⌄</span>
      </button>
      {open && <div id={id} className="space-y-6">{children}</div>}
    </div>
  );
}
