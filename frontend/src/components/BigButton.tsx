import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "success";
type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant };

const LOOKS: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-accent-dark",
  secondary: "bg-card text-accent shadow-card hover:bg-white/70",
  success: "bg-good text-white hover:brightness-95",
};

// Large, calm button sized for older adults (well above the 44px touch minimum).
// Use `variant` for colour; size overrides (min-h-*, text-*) can go in className.
export default function BigButton({ variant = "primary", className = "", ...rest }: Props) {
  return (
    <button
      type="button"
      className={`w-full min-h-[3.4rem] px-6 py-4 text-xl font-semibold rounded-control transition
        active:scale-[0.98] disabled:opacity-40 focus-ring ${LOOKS[variant]} ${className}`}
      {...rest}
    />
  );
}
