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
        setStatus(bits.length ? bits.join(" · ") : "ok");
    },
    [update],
  );

  return (
    <div className="mx-auto grid max-w-3xl gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Setup</h1>
      </div>

      <PairPanel onApply={applyPair} />

      <section className="card">
        <h2 className="text-lg font-semibold">Status</h2>
        <p className="muted mt-2">
          Google: {settings.youtubeAccessToken ? "an" : "aus"}
        </p>
        <p className="muted">
          Plex: {settings.plexServerName || (settings.plexToken ? "Server fehlt" : "aus")}
        </p>
        {youtubeOauthClientId(settings) ? (
          <p className="ok mt-2">OAuth an</p>
        ) : (
          <p className="warn mt-2">OAuth aus</p>
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
                  plexServerId: "",
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
        <h2 className="text-lg font-semibold">Link</h2>
        <p className="mono wrap mt-2">{teslaRedirectUrl(publicSiteUrl())}</p>
      </section>
    </div>
  );
}
