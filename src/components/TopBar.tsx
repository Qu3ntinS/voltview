import { Search } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatClock } from "../lib/format";
import { useSettings } from "../lib/settings";

export function TopBar() {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [clock, setClock] = useState(formatClock);
  const [q, setQ] = useState("");

  useEffect(() => {
    const id = window.setInterval(() => setClock(formatClock()), 15000);
    return () => window.clearInterval(id);
  }, []);

  function onSearch(event: FormEvent) {
    event.preventDefault();
    if (!q.trim()) return;
    navigate(`/search?q=${encodeURIComponent(q.trim())}`);
  }

  return (
    <header className="flex items-center gap-4 px-6 py-4">
      <div>
        <p className="font-display text-lg font-bold tracking-wide">VoltView</p>
        <p className="text-[11px] uppercase tracking-[0.24em] text-mist">Midnight Theater</p>
      </div>
      <form onSubmit={onSearch} role="search" className="relative mx-auto w-full max-w-xl">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-mist" aria-hidden />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          type="search"
          name="q"
          aria-label="YouTube, Plex oder Radio suchen"
          placeholder="YouTube, Plex oder Radio suchen"
          className="h-14 w-full rounded-2xl border border-white/8 bg-panel px-12 text-base outline-none ring-volt/40 placeholder:text-mist/70 focus:ring-2"
        />
      </form>
      <div className="hidden text-right md:block">
        <p className="font-display text-2xl font-bold tabular-nums">{clock}</p>
        <p className="text-[11px] text-mist">
          {settings.plexServerName ? `Plex · ${settings.plexServerName}` : "Plex getrennt"}
          {settings.youtubeApiKey ? " · YT bereit" : " · YT Key fehlt"}
        </p>
      </div>
    </header>
  );
}
