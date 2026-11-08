import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" };

// Large, high-contrast button sized for older adults (well above the 44px touch minimum).
export default function BigButton({ variant = "primary", className = "", ...rest }: Props) {
  const look =
    variant === "primary"
      ? "bg-sky-700 text-white hover:bg-sky-800 active:bg-sky-900"
      : "bg-white text-sky-900 border-4 border-sky-700 hover:bg-sky-50";
  return (
    <button
      type="button"
      className={`w-full min-h-20 px-8 py-5 text-2xl font-bold rounded-2xl shadow-sm transition-colors
        focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-400 disabled:opacity-50 ${look} ${className}`}
      {...rest}
    />
  );
}
