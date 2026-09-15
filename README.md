# VoltView

Persönliches Midnight-Purple Theater für den Browser — inkl. Tesla-Display. Inspiriert von der Idee hinter TeslaPlay, aber ohne Zeitlimit, ohne Abo und mit **deinem** Plex-Server.

VoltView ist **kein** Streaming-Anbieter. Es ist ein Hub:

- **Apps** öffnen Netflix, Disney+, Prime, Max, Joyn, ARD, ZDF und andere **offizielle** Web-Apps mit deinem eigenen Account.
- **YouTube** spielt über die offizielle IFrame-API in voller Länge. Trends und Suche nutzen die YouTube Data API v3.
- **Plex** spricht die offizielle Plex-API an (PIN-Login, deine Libraries, HLS-Transcode).
- **Radio** kommt aus dem öffentlichen Radio-Browser-Verzeichnis.
- **Games** sind kleine Beifahrer-Pausen, kein Content-Katalog.

TeslaPlay begrenzt ohne Premium oft auf 20 Minuten. Das ist deren Produktlimit, kein Tesla- oder YouTube-Limit. VoltView setzt keins.

## Was VoltView bewusst nicht macht

- Keine fremden IPTV-Listen, keine Xtream-Panels, keine geklauten Streams.
- Kein Netflix-/Disney-Katalog im eigenen Player und kein DRM-Bypass.
- Kein Scraping von YouTube. Nur offizielle APIs.

Marken gehören ihren Inhabern. VoltView ist unabhängig von Tesla, Google, Netflix und Plex.

## Techstack

- **Frontend:** React 18, Vite, Tailwind 4, React Router
- **Backend:** Bun + Elysia (YouTube-, Plex- und Radio-Proxy)
- **Theme:** Dark, techy, Midnight Purple (`#8b5cf6` auf `#05030a`)

Große Touch-Targets, Landscape-first, Build-Target ES2019 für ältere Tesla-Browser.

## Schnellstart

```bash
bun install
cp .env.example .env
bun run dev
```

- UI: http://127.0.0.1:5173
- API: http://127.0.0.1:3001

Produktion:

```bash
bun run build
bun run start
```

Die API serviert dann `dist/` mit.

## Setup im UI

1. **YouTube:** Google Cloud Console → YouTube Data API v3 aktivieren → Key unter *Setup* eintragen. Ohne Key kannst du trotzdem Videos per ID/Suche-URL abspielen, sobald du eines öffnest; Trends bleiben leer.
2. **Plex:** *Plex verbinden* → Code auf [plex.tv/link](https://plex.tv/link) freigeben → Server wählen. Token bleibt im `localStorage` dieses Browsers.
3. **Tesla:** VoltView als Lesezeichen speichern. Netflix & Co. verlassen die Seite — zurück nur über das Bookmark.

## Sicherheit im Auto

Nur im Stand nutzen. Blick auf den Bildschirm während der Fahrt ist gefährlich und oft verboten.

## Scripts

| Command | Zweck |
| --- | --- |
| `bun run dev` | Vite + Elysia parallel |
| `bun run build` | Frontend-Build |
| `bun run start` | API + statisches UI |
| `bun test` | API- und Helper-Tests |
| `bun run typecheck` | TypeScript |

## Repo

https://github.com/Qu3ntinS/voltview
