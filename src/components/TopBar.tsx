import { Search } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { formatClock } from "../lib/format";
import { useSettings } from "../lib/settings";
import { teslaFullscreen } from "../lib/tesla";

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

  const yt = settings.youtubeAccessToken ? "YT an" : "YT";
  const plex = settings.plexServerName || "Plex aus";

  return (
    <header className="topbar">
      <Link to="/" className="brand">
        <span className="brand-mark" aria-hidden>
          VV
        </span>
        VoltView
      </Link>
      <form onSubmit={onSearch} role="search" className="search">
        <Search className="search-icon" aria-hidden />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          type="search"
          name="q"
          aria-label="Suchen"
          placeholder="Suchen"
        />
      </form>
      <button type="button" className="btn btn-quiet" onClick={() => teslaFullscreen()}>
        Vollbild
      </button>
      <Link to="/settings" className="btn btn-quiet hide-narrow">
        QR
      </Link>
      <div className="clock hide-narrow">
        <p className="clock-time">{clock}</p>
        <p className="muted tiny">
          {plex} · {yt}
        </p>
      </div>
    </header>
  );
}
