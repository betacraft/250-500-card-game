import { Link } from 'react-router-dom';

/**
 * Landing page. Two big mode buttons: Scorekeeper (live) and Online (Phase 2).
 */
export function HomePage(): JSX.Element {
  return (
    <main className="flex min-h-screen flex-col px-6 py-8">
      <header className="mb-12 mt-8">
        <h1 className="text-3xl font-medium text-suit-black">250 &amp; 500</h1>
        <p className="mt-2 text-sm text-stone-600">
          The card game scorekeeper for your group.
        </p>
      </header>

      <section className="flex flex-1 flex-col gap-4">
        <Link
          to="/scorekeeper/setup"
          className="block rounded-xl bg-felt p-6 text-white shadow-sm active:scale-95 active:bg-felt-dark transition-transform"
        >
          <div className="text-lg font-medium">Score in-person game</div>
          <div className="mt-1 text-sm opacity-90">
            Track bids, partners, and points while friends play with physical cards.
          </div>
        </Link>

        <Link
          to="/online"
          className="block rounded-xl border-2 border-felt bg-white p-6 text-stone-900 active:scale-95 transition-transform"
        >
          <div className="text-lg font-medium">Play online</div>
          <div className="mt-1 text-sm text-stone-600">
            Multiplayer with friends from any phone.
          </div>
        </Link>
      </section>

      <footer className="mt-8 text-center text-xs text-stone-500">
        v0.1.0 — Mobile only · Works offline
      </footer>
    </main>
  );
}
