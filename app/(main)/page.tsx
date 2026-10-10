import { BookLock, Compass, Feather, Send } from "lucide-react";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";

const SAMPLES = [
  {
    author: "Wren Halloway",
    date: "Tuesday",
    title: null,
    text: "The bus driver waved at another bus driver this morning and both of them smiled like they shared a secret. I think about that more than I should.",
    visibility: "Public",
  },
  {
    author: "You",
    date: "Last night",
    title: "Notes before sleep",
    text: "Called home. Mum asked if I was eating properly, which is her way of saying she misses me. I said yes, which is mine.",
    visibility: "Private",
  },
  {
    author: "Idris Marlowe",
    date: "March",
    title: "Second-hand",
    text: "Someone underlined one sentence in this book, forty years ago, in pencil. I have been trying to understand why ever since.",
    visibility: "Public",
  },
];

const FEATURES = [
  {
    icon: Feather,
    title: "Write freely",
    body: "A quiet page with nothing in the way. A single line or a long essay, it saves itself as you go.",
  },
  {
    icon: BookLock,
    title: "Keep what is yours",
    body: "Every entry starts private. Your journal is a personal archive, searchable and organised by date, and nobody else can see it.",
  },
  {
    icon: Send,
    title: "Share when you're ready",
    body: "Publish a piece when it feels right, unpublish it when it doesn't. Readers can respond with a like or a kind word.",
  },
  {
    icon: Compass,
    title: "Find words that resonate",
    body: "Read short thoughts and longer reflections from people you'll never meet, and follow the ones who feel familiar.",
  },
];

export default async function Landing({ searchParams }: PageProps<"/">) {
  const deleted = (await searchParams).account === "deleted";
  return (
    <main className="overflow-x-clip">
      {deleted && (
        <p role="status" className="bg-paper-soft px-4 py-3 text-center text-sm text-muted">
          Your account and writing have been deleted.
        </p>
      )}
      <section className="mx-auto grid max-w-5xl gap-14 px-4 pt-16 pb-20 sm:pt-24 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <p className="text-xs font-medium tracking-[0.2em] text-taupe uppercase">For the words that need somewhere to go</p>
          <h1 className="mt-5 font-serif text-4xl leading-[1.15] text-balance sm:text-5xl">
            Some words are just for you. Others are waiting to be found.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
            Inkwell is a home for the things you write to understand yourself, remember a moment, or connect with someone who
            feels the same way.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/signup" className={buttonClass("primary")}>
              Start writing
            </Link>
            <Link href="/discover" className={buttonClass("secondary")}>
              Explore words
            </Link>
          </div>
        </div>

        <div aria-hidden className="relative mx-auto w-full max-w-md space-y-4 select-none">
          {SAMPLES.map((s, i) => (
            <article
              key={s.author}
              className={`rounded-xl border border-line bg-white/70 p-5 ${i === 1 ? "lg:translate-x-8" : ""}`}
            >
              <div className="flex items-center justify-between text-xs text-muted">
                <span>
                  {s.author} · {s.date}
                </span>
                <span className="rounded-full bg-paper-soft px-2 py-0.5">{s.visibility}</span>
              </div>
              {s.title && <h2 className="mt-3 font-serif text-lg">{s.title}</h2>}
              <p className={`font-serif leading-relaxed text-ink/90 ${s.title ? "mt-1.5" : "mt-3"}`}>{s.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-line bg-paper-soft/60">
        <div className="mx-auto grid max-w-5xl gap-x-12 gap-y-12 px-4 py-20 sm:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title}>
              <Icon aria-hidden className="size-5 text-taupe" strokeWidth={1.6} />
              <h2 className="mt-4 font-serif text-2xl">{title}</h2>
              <p className="mt-3 leading-relaxed text-muted">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-reading px-4 py-24 text-center">
        <h2 className="font-serif text-3xl leading-snug text-balance sm:text-4xl">Start a collection of your own words.</h2>
        <p className="mt-4 text-muted">Free to write. Private until you say otherwise.</p>
        <Link href="/signup" className={buttonClass("primary", "mt-8")}>
          Start writing
        </Link>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-muted">
          <span className="font-serif text-ink">Inkwell</span>
          <nav aria-label="Footer" className="flex gap-5">
            <Link href="/about" className="hover:text-ink">
              About
            </Link>
            <Link href="/discover" className="hover:text-ink">
              Discover
            </Link>
            <Link href="/login" className="hover:text-ink">
              Log in
            </Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
