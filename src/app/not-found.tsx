import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-16">
      <h1 className="font-display text-3xl font-semibold tracking-tight">That page is not here</h1>
      <p className="mt-3 leading-relaxed text-muted">
        The link may be from before the demo was reset, or from another browser. Each visitor gets their own private copy of the sample data, so a
        link only opens in the browser that created it.
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/" className="btn btn-primary">
          Go to the client side
        </Link>
        <Link href="/practice" className="btn btn-quiet">
          Go to the practice side
        </Link>
      </div>
    </main>
  );
}
