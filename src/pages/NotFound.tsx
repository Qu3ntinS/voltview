import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-xl py-16">
      <p className="text-xs uppercase tracking-[0.28em] text-volt-2">404</p>
      <h1 className="mt-2 font-display text-4xl font-extrabold">Seite nicht gefunden</h1>
      <p className="mt-4 text-mist">
        Diese Adresse gehört nicht zu VoltView. Player, Suche und unbekannte Pfade bleiben außerhalb
        des Suchindex.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link to="/" className="inline-flex h-14 items-center rounded-2xl bg-volt px-6 text-lg font-semibold">
          Zur Startseite
        </Link>
        <Link
          to="/apps"
          className="inline-flex h-14 items-center rounded-2xl border border-white/10 bg-white/5 px-6 text-lg"
        >
          Streaming-Apps
        </Link>
      </div>
    </div>
  );
}
