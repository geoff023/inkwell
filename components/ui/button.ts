const base =
  "inline-flex shrink-0 items-center whitespace-nowrap justify-center gap-2 rounded-full text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60";

const variants = {
  primary: "bg-ink text-paper hover:bg-ink/90 px-5 py-2.5",
  secondary: "border border-line bg-surface text-ink hover:bg-white px-5 py-2.5",
  ghost: "text-muted hover:text-ink hover:bg-paper-soft px-3 py-2",
  danger: "bg-danger text-white hover:bg-danger/90 px-5 py-2.5",
} as const;

export type ButtonVariant = keyof typeof variants;

/** Class names for buttons and button-styled links. */
export function buttonClass(variant: ButtonVariant = "primary", extra = "") {
  return `${base} ${variants[variant]} ${extra}`.trim();
}
