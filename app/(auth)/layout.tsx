import { Wordmark } from "@/components/shell/wordmark";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col px-4">
      <header className="mx-auto w-full max-w-5xl py-6">
        <Wordmark />
      </header>
      <main className="mx-auto w-full max-w-sm flex-1 py-10 sm:py-16">{children}</main>
    </div>
  );
}
