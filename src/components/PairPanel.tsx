import { useEffect, useState } from "react";
import { QrCode } from "./QrCode";
import { addLandingUrl, pair, type PairSettings } from "../lib/pair";

export function PairPanel({
  compact,
  onApply,
}: {
  compact?: boolean;
  onApply: (settings: PairSettings) => void;
}) {
  const [id, setId] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let stop = false;
    pair
      .create()
      .then((room) => {
        if (stop) return;
        setId(room.id);
        setUrl(room.addUrl);
      })
      .catch(() => {
        if (stop) return;
        setError("Sync offline.");
        setUrl(addLandingUrl());
      });
    return () => {
      stop = true;
    };
  }, []);

  useEffect(() => {
    if (!id || done) return undefined;
    const tick = window.setInterval(() => {
      pair
        .status(id)
        .then((status) => {
          if (!status.ready || !status.settings) return;
          onApply(status.settings);
          setDone(true);
          pair.consume(id).catch(() => undefined);
        })
        .catch(() => undefined);
    }, 1500);
    return () => window.clearInterval(tick);
  }, [id, done, onApply]);

  if (compact) {
    return (
      <div className="pair-inline">
        {url ? <QrCode value={url} label="QR" /> : <div className="qr-box qr-box-wait" />}
        <div>
          <p className="pair-kicker">Handy</p>
          <p className="pair-title">{done ? "Übernommen" : "QR"}</p>
          {id ? <p className="pair-code">{id.length <= 8 ? id : id.slice(0, 8)}</p> : null}
        </div>
      </div>
    );
  }

  return (
    <section className="card pair-card">
      <div className="pair-grid">
        {url ? <QrCode value={url} label="QR" /> : <div className="qr-box qr-box-wait" />}
        <div>
          <p className="pair-kicker">VoltView</p>
          <h2>QR</h2>
          {id && !id.includes("-") ? <p className="pair-code">{id}</p> : null}
          {url ? (
            <p className="mono muted wrap">
              {url.replace(/^https?:\/\//, "")}
            </p>
          ) : null}
          {error ? <p className="warn">{error}</p> : null}
          {done ? <p className="ok">Übernommen</p> : <p className="muted">Wartet…</p>}
        </div>
      </div>
    </section>
  );
}
