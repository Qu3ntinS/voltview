# VoltView

Persönliches Midnight-Purple Theater für den Browser — inkl. Tesla-Display. Inspiriert von der Idee hinter TeslaPlay, aber ohne Zeitlimit, ohne Abo und mit **deinem** Plex-Server.

VoltView ist **kein** Streaming-Anbieter. Es ist ein Hub:

- **Apps** öffnen Netflix, Disney+, Prime, Max, Joyn, ARD, ZDF und andere **offizielle** Web-Apps mit deinem eigenen Account. Jeder Dienst hat eine eigene VoltView-Seite.
- **YouTube** läuft im eigenen HTML5-Player (kein YouTube-IFrame — den unterdrückt der Tesla-Browser). Trends und Suche nutzen die YouTube Data API v3.
- **Plex** spricht die offizielle Plex-API an (PIN-Login, deine Libraries, HLS-Transcode).
- **Radio** kommt aus dem öffentlichen Radio-Browser-Verzeichnis.
- **Games** sind kleine Beifahrer-Pausen, kein Content-Katalog.

TeslaPlay begrenzt ohne Premium oft auf 20 Minuten. Das ist deren Produktlimit, kein Tesla- oder YouTube-Limit. VoltView setzt keins.

## Was VoltView bewusst nicht macht

- Keine fremden IPTV-Listen, keine Xtream-Panels, keine geklauten Streams.
- Kein Netflix-/Disney-Katalog im eigenen Player und kein DRM-Bypass.
- YouTube-Wiedergabe holt den Stream selbst (InnerTube / Invidious / Piped), weil Tesla den Original-IFrame nur als Ton durchlässt.

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

## Vercel (empfohlen)

Kein extra GitHub-Action nötig. Vercel hängt am Repo und deployed selbst:

1. Einmalig: [vercel.com/new](https://vercel.com/new) → GitHub-Repo `Qu3ntinS/voltview` importieren → Deploy.
2. Danach: Push auf `master` = Production, jeder PR bekommt eine Preview-URL.

Hobby-Plan reicht. Build nimmt `bun run build:vercel` (`vercel.json`, Bun 1.4.x). YouTube, Apps, Radio, Games und QR-Live-Sync laufen (Sync über jsonblob, weil Vercel hier kein `/api/pair` hat). Plex braucht weiter `bun run start`.

YouTube-Key in Vercel: Project → Settings → Environment Variables

- Name: `YOUTUBE_API_KEY` (oder `VITE_YOUTUBE_API_KEY`)
- Environments: Production (und Preview, wenn du Previews testest)
- Danach **Redeploy**, sonst bleibt der alte Build ohne Key

Der Key wird beim Build ins Frontend gebacken. In der Google Cloud HTTP-Referrer auf `https://<projekt>.vercel.app/*` setzen.

Google OAuth JS-Origin: deine `*.vercel.app`-URL (ohne Pfad). Tesla-Theater: `https://www.youtube.com/redirect?q=https://<projekt>.vercel.app/`

Im Tesla-Browser leitet VoltView selbst über `youtube.com/redirect` weiter (Tesla-Play-Workaround), damit HTML5-Video erlaubt ist. Abspielen läuft danach im VoltView-Player (`<video>` + HLS), nicht im YouTube-IFrame. Die Stand-Warnung vor dem Player bleibt.

## GitHub Pages (ohne eigenen Server)

Nach dem Push auf `master`/`main` schreibt der Workflow `dist/` auf den Branch `gh-pages`.

Einmalig: Repo → **Settings → Pages → Build and deployment → Deploy from a branch** → Branch `gh-pages` / `/ (root)` → Save.

Danach:

1. URL: https://qu3ntins.github.io/voltview/
2. Tesla-Theater: `https://www.youtube.com/redirect?q=https://qu3ntins.github.io/voltview/`
3. Google OAuth JS-Origin: `https://qu3ntins.github.io`

Lokal dasselbe Paket bauen: `bun run build:pages` (legt `404.html` und `.nojekyll` in `dist/`).

Auf Pages laufen YouTube, Apps, Radio und Games ohne Backend. Plex nicht — dafür `bun run start`.

## Setup im UI

1. **YouTube:** Google Cloud Console → YouTube Data API v3 aktivieren → Key unter *Setup* eintragen. Für Abos/Likes eine OAuth-Client-ID (Web, JS-Origin = deine VoltView-URL, Scope `youtube.readonly`) und auf YouTube *Mit Google anmelden*. Vor jedem Video erscheint eine Stand-Warnung. Tesla-Vollbild nutzt `youtube.com/redirect?q=…`.
2. **Plex:** *Plex verbinden* → Code auf [plex.tv/link](https://plex.tv/link) freigeben → Server wählen. Token bleibt im `localStorage` dieses Browsers.
3. **Tesla:** VoltView als Lesezeichen speichern. Netflix & Co. verlassen die Seite — zurück nur über das Bookmark.

## Sicherheit im Auto

Nur im Stand nutzen. Blick auf den Bildschirm während der Fahrt ist gefährlich und oft verboten.

## Scripts

| Command | Zweck |
| --- | --- |
| `bun run dev` | Vite + Elysia parallel |
| `bun run build` | Frontend-Build |
| `bun run build:pages` | Statischer Build für GitHub Pages |
| `bun run build:vercel` | Statischer Build für Vercel (`base=/`) |
| `bun run start` | API + statisches UI |
| `bun test` | API- und Helper-Tests |
| `bun run typecheck` | TypeScript |

## SEO

- Pro Route eigene Title, Description, Canonical, Open Graph, Twitter Cards
- JSON-LD: WebSite, WebApplication, Breadcrumb; `/apps` zusätzlich ItemList aller Dienste
- `robots.txt`, `sitemap.xml` (alle öffentlichen App-Seiten), `og.png` 1200×630, Web-Manifest
- Player, Suche, Setup, persönliche Plex-Bibliotheken und 404 sind `noindex`
- `bun run build` / `build:pages` schreibt statische HTML-Shells (`dist/apps/disney/index.html` usw.), damit Crawler und Link-Vorschauen die Meta-Tags ohne JavaScript sehen
- GitHub Project Pages liest `robots.txt` nur unter `github.io/robots.txt`. Deshalb zählen die Meta-Robots-Tags; Sitemap in der Search Console einreichen: `https://qu3ntins.github.io/voltview/sitemap.xml`

## Repo

https://github.com/Qu3ntinS/voltview
