import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "success";
type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant };

// Dark text on the bright fills keeps contrast high for older eyes.
const LOOKS: Record<Variant, string> = {
  primary: "bg-accent text-accent-ink hover:bg-accent-dark",
  secondary: "bg-raised text-ink hover:bg-[#2A2A2E]",
  success: "bg-good text-[#06200D] hover:brightness-95",
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
