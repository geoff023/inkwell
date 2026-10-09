import type { Metadata } from "next";
import { requireViewer } from "@/lib/auth";

export const metadata: Metadata = { title: "Home" };

export default async function HomePage() {
  const viewer = await requireViewer("/home");
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12">
      <h1 className="font-serif text-3xl">Hello, {viewer.display_name}.</h1>
    </main>
  );
}
