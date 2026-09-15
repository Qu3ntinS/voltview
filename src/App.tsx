import { lazy, Suspense, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { BootScreen } from "./components/BootScreen";
import { Shell } from "./components/Shell";

const HomePage = lazy(() => import("./pages/Home").then((m) => ({ default: m.HomePage })));
const AppsPage = lazy(() => import("./pages/Apps").then((m) => ({ default: m.AppsPage })));
const YouTubePage = lazy(() => import("./pages/YouTube").then((m) => ({ default: m.YouTubePage })));
const WatchYouTubePage = lazy(() => import("./pages/WatchYouTube").then((m) => ({ default: m.WatchYouTubePage })));
const PlexPage = lazy(() => import("./pages/Plex").then((m) => ({ default: m.PlexPage })));
const PlexLibraryPage = lazy(() => import("./pages/PlexLibrary").then((m) => ({ default: m.PlexLibraryPage })));
const PlexItemPage = lazy(() => import("./pages/PlexItem").then((m) => ({ default: m.PlexItemPage })));
const WatchPlexPage = lazy(() => import("./pages/WatchPlex").then((m) => ({ default: m.WatchPlexPage })));
const RadioPage = lazy(() => import("./pages/Radio").then((m) => ({ default: m.RadioPage })));
const GamesPage = lazy(() => import("./pages/Games").then((m) => ({ default: m.GamesPage })));
const SettingsPage = lazy(() => import("./pages/Settings").then((m) => ({ default: m.SettingsPage })));
const SearchPage = lazy(() => import("./pages/Search").then((m) => ({ default: m.SearchPage })));

function Loading() {
  return <div className="p-8 text-mist">Lade Modul…</div>;
}

export function App() {
  const [booted, setBooted] = useState(() => sessionStorage.getItem("voltview.booted") === "1");

  if (!booted) {
    return (
      <BootScreen
        onDone={() => {
          sessionStorage.setItem("voltview.booted", "1");
          setBooted(true);
        }}
      />
    );
  }

  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route element={<Shell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/apps" element={<AppsPage />} />
          <Route path="/youtube" element={<YouTubePage />} />
          <Route path="/watch/yt/:id" element={<WatchYouTubePage />} />
          <Route path="/plex" element={<PlexPage />} />
          <Route path="/plex/library/:key" element={<PlexLibraryPage />} />
          <Route path="/plex/item/:id" element={<PlexItemPage />} />
          <Route path="/watch/plex/:id" element={<WatchPlexPage />} />
          <Route path="/radio" element={<RadioPage />} />
          <Route path="/games" element={<GamesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
