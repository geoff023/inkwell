// ponytail: initials only. Show avatar_url images once avatar uploads exist.
export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "size-7 text-xs", md: "size-9 text-sm", lg: "size-16 text-2xl" };
  return (
    <span aria-hidden className={`inline-flex shrink-0 items-center justify-center rounded-full border border-line bg-paper-soft font-serif text-ink ${sizes[size]}`}>
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}
