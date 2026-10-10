import type { ReactNode } from "react";
import { railMain } from "./page-grid";

/** Title row shared by every signed-in page: serif title, one line of context, optional action. */
export function PageHeader({ title, description, action }: { title: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return (
    <header className={`flex flex-wrap items-end justify-between gap-4 ${railMain}`}>
      <div className="min-w-0">
        <h1 className="font-serif text-3xl text-balance sm:text-4xl">{title}</h1>
        {description && <div className="mt-2 flex items-center gap-1.5 text-muted">{description}</div>}
      </div>
      {action}
    </header>
  );
}
