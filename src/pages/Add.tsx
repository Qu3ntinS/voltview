import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, type PlexServer } from "../lib/api";
import { requestYoutubeToken, youtubeOauthClientId } from "../lib/google";
import { pair } from "../lib/pair";
import { pickPlexConnection } from "../lib/plexTv";
import { loadSettings, type Settings } from "../lib/storage";

export function AddPage() {
  const [params] = useSearchParams();
  const room = params.get("r") || "";
  const [form, setForm] = useState<Settings>(() => loadSettings());
  const formRef = useRef(form);
  formRef.current = form;
  const [pin, setPin] = useState<{ id: number; code: string; authUrl: string } | null>(null);
  const [servers, setServers] = useState<PlexServer[]>([]);
  const [status, setStatus] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  function apply(next: Partial<Settings>) {
    const merged = { ...formRef.current, ...next };
    formRef.current = merged;
    setForm(merged);
    return merged;
  }

  async function push(next: Partial<Settings> = {}) {
    const merged = apply(next);
    if (!room) {
      setStatus("QR auf dem Tesla scannen — dann landet der Login im Auto.");
      return;
    }
    setBusy(true);
    setStatus("Sende an Tesla…");
    try {
      await pair.submit(room, merged);
      setSent(true);
      setStatus("Liegt auf dem Tesla.");
    } catch (error) {
      setSent(false);
      setStatus((error as Error).message === "PAIR_NOT_FOUND" ? "Code abgelaufen. QR neu scannen." : "Senden fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!pin || form.plexToken) return undefined;
    const id = window.setInterval(() => {
      api
        .plexPinStatus(formRef.current, pin.id)
        .then((data) => {
          if (data.authToken) {
            setPin(null);
            setStatus("Plex verbunden. Server wählen.");
            void push({ plexToken: data.authToken });
          }
        })
        .catch(() => undefined);
    }, 2000);
    return () => window.clearInterval(id);
  }, [pin, form.plexToken, room]);

  useEffect(() => {
    if (!form.plexToken) return;
    api
      .plexResources(form)
      .then((data) => setServers(data.servers || []))
      .catch(() => undefined);
  }, [form.plexToken, form.plexClientId]);

  async function google() {
    setStatus("");
    try {
      const token = await requestYoutubeToken(youtubeOauthClientId(formRef.current));
      await push({ youtubeAccessToken: token, youtubeClientId: youtubeOauthClientId(formRef.current) });
    } catch (error) {
      setStatus((error as Error).message);
    }
  }

  async function startPlex() {
    setStatus("");
    try {
      setPin(await api.plexPin(formRef.current));
    } catch (error) {
      setStatus((error as Error).message);
    }
  }

  const code = useMemo(() => (room && !room.includes("-") ? room : room.slice(0, 8)), [room]);

  return (
    <div className="add-page">
      <header className="add-head">
        <p className="pair-kicker">VoltView · Handy</p>
        <h1>Sync</h1>
        <p className="muted">Google und Plex hier anmelden. Der Tesla übernimmt den Stand — ohne Tastatur im Auto.</p>
        {room ? (
          <p className="pair-code">{code}</p>
        ) : (
          <p className="warn">QR auf dem Tesla scannen, sonst kommt der Login nicht zurück.</p>
        )}
      </header>

      <section className="card mb-4">
        <p className="pair-kicker">1 · Google</p>
        <p className="muted">Abos und Kanäle auf dem Tesla.</p>
        <button type="button" className="btn btn-primary mt-3" onClick={() => void google()}>
          {form.youtubeAccessToken ? "Google neu verbinden" : "Mit Google anmelden"}
        </button>
        {form.youtubeAccessToken ? <p className="ok mt-2">Google verbunden.</p> : null}
      </section>

      <section className="card mb-4">
        <p className="pair-kicker">2 · Plex</p>
        <p className="muted">Account auf dem Phone, Bibliothek im Auto.</p>
        <button type="button" className="btn mt-3" onClick={() => void startPlex()}>
          {form.plexToken ? "Plex neu verbinden" : "Plex verbinden"}
        </button>
        {pin ? (
          <div className="mt-3">
            <p className="muted">Plex öffnen, einloggen, hierher zurück. Der Tesla übernimmt den Account.</p>
            <a className="btn btn-primary mt-2" href={pin.authUrl} target="_blank" rel="noreferrer">
              Plex öffnen
            </a>
          </div>
        ) : null}
        {servers.length ? <p className="muted mt-4">Server wählen — wird sofort gesendet.</p> : null}
        {servers.map((server) => (
          <button
            key={server.clientIdentifier}
            type="button"
            className="list-btn"
            onClick={() => {
              const connection = pickPlexConnection(server);
              if (!connection) return;
              void push({
                plexToken: formRef.current.plexToken,
                plexServerUri: connection.uri,
                plexServerToken: server.accessToken,
                plexServerName: server.name,
                plexServerId: server.clientIdentifier,
              });
            }}
          >
            {server.name}
            {form.plexServerId === server.clientIdentifier || form.plexServerName === server.name ? " · aktiv" : ""}
          </button>
        ))}
      </section>

      <label>
        Region
        <select
          value={form.youtubeRegion}
          onChange={(e) => {
            void push({ youtubeRegion: e.target.value });
          }}
        >
          {["DE", "AT", "CH", "US", "GB", "FR"].map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
      </label>

      <button type="button" className="btn btn-primary" onClick={() => void push()} disabled={!room || busy}>
        {sent ? "Nochmal senden" : "An Tesla senden"}
      </button>
      {status ? <p className={sent ? "ok" : "warn"}>{status}</p> : null}

      <p>
        <Link to="/">Zurück</Link>
      </p>
    </div>
  );
}
