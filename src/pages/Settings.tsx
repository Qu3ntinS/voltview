import { useCallback, useState } from "react";
import { publicSiteUrl } from "../lib/env";
import { youtubeOauthClientId } from "../lib/google";
import { type PairSettings } from "../lib/pair";
import { useSettings } from "../lib/settings";
import { teslaRedirectUrl } from "../lib/tesla";
import { PairPanel } from "../components/PairPanel";

export function SettingsPage() {
  const { settings, update } = useSettings();
  const [status, setStatus] = useState("");

  const applyPair = useCallback(
    (next: PairSettings) => {
      update(next);
      const bits = [
        next.youtubeAccessToken ? "Google" : "",
        next.plexToken || next.plexServerName ? "Plex" : "",
      ].filter(Boolean);
      setStatus(bits.length ? `${bits.join(" + ")} vom Handy übernommen.` : "Vom Handy übernommen.");
    },
    [update],
  );

  return (
    <div className="mx-auto grid max-w-3xl gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Setup</h1>
        <p className="muted mt-1">QR auf dem Tesla, einloggen auf dem Handy. Kein Tippen im Auto.</p>
      </div>

      <PairPanel onApply={applyPair} />

      <section className="card">
        <h2 className="text-lg font-semibold">Status</h2>
        <p className="muted mt-2">
          Google: {settings.youtubeAccessToken ? "verbunden — Abos und Likes persönlich" : "offen. QR scannen."}
        </p>
        <p className="muted">
          Plex: {settings.plexServerName || (settings.plexToken ? "Account da, Server fehlt" : "offen. QR scannen.")}
        </p>
        {youtubeOauthClientId(settings) ? (
          <p className="ok mt-2">Google-Login auf dem Handy ist bereit.</p>
        ) : (
          <p className="warn mt-2">
            Auf Vercel einmal YOUTUBE_CLIENT_ID setzen (OAuth Web-Client, nicht der AIza-Key).
          </p>
        )}
        <div className="row-gap mt-3">
          {settings.youtubeAccessToken ? (
            <button type="button" className="btn" onClick={() => update({ youtubeAccessToken: "" })}>
              Google trennen
            </button>
          ) : null}
          {settings.plexToken ? (
            <button
              type="button"
              className="btn"
              onClick={() =>
                update({
                  plexToken: "",
                  plexServerUri: "",
                  plexServerToken: "",
                  plexServerName: "",
                })
              }
            >
              Plex trennen
            </button>
          ) : null}
        </div>
        <label className="mt-3 block">
          Region
          <select value={settings.youtubeRegion} onChange={(e) => update({ youtubeRegion: e.target.value })}>
            {["DE", "AT", "CH", "US", "GB", "FR"].map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </label>
        {status ? <p className="ok mt-3">{status}</p> : null}
      </section>

      <section className="card">
        <h2 className="text-lg font-semibold">Tesla-Link</h2>
        <p className="muted mt-2">
          Diesen YouTube-Redirect als Lesezeichen speichern — wie Tesla Play. Dann darf der Browser HTML5-Video.
        </p>
        <p className="mono wrap mt-2">{teslaRedirectUrl(publicSiteUrl())}</p>
      </section>
    </div>
  );
}
