import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { Shell } from "./components/Shell";

const HomePage = lazy(() => import("./pages/Home").then((m) => ({ default: m.HomePage })));
const ComingSoonPage = lazy(() => import("./pages/ComingSoon").then((m) => ({ default: m.ComingSoonPage })));
const YouTubePage = lazy(() => import("./pages/YouTube").then((m) => ({ default: m.YouTubePage })));
const ChannelPage = lazy(() => import("./pages/Channel").then((m) => ({ default: m.ChannelPage })));
const WatchYouTubePage = lazy(() => import("./pages/WatchYouTube").then((m) => ({ default: m.WatchYouTubePage })));
const PlexPage = lazy(() => import("./pages/Plex").then((m) => ({ default: m.PlexPage })));
const PlexLibraryPage = lazy(() => import("./pages/PlexLibrary").then((m) => ({ default: m.PlexLibraryPage })));
const PlexItemPage = lazy(() => import("./pages/PlexItem").then((m) => ({ default: m.PlexItemPage })));
const WatchPlexPage = lazy(() => import("./pages/WatchPlex").then((m) => ({ default: m.WatchPlexPage })));
const SettingsPage = lazy(() => import("./pages/Settings").then((m) => ({ default: m.SettingsPage })));
const SearchPage = lazy(() => import("./pages/Search").then((m) => ({ default: m.SearchPage })));
const AddPage = lazy(() => import("./pages/Add").then((m) => ({ default: m.AddPage })));
const NotFoundPage = lazy(() => import("./pages/NotFound").then((m) => ({ default: m.NotFoundPage })));

function Loading() {
  return <div className="p-6 text-mist">Laden…</div>;
}

export function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/add" element={<AddPage />} />
        <Route path="/watch/yt/:id" element={<WatchYouTubePage />} />
        <Route path="/watch/plex/:id" element={<WatchPlexPage />} />
        <Route element={<Shell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/apps" element={<ComingSoonPage feature="apps" />} />
          <Route path="/apps/:id" element={<ComingSoonPage feature="apps" />} />
          <Route path="/mirror" element={<ComingSoonPage feature="mirror" />} />
          <Route path="/youtube" element={<YouTubePage />} />
          <Route path="/youtube/channel/:id" element={<ChannelPage />} />
          <Route path="/plex" element={<PlexPage />} />
          <Route path="/plex/library/:key" element={<PlexLibraryPage />} />
          <Route path="/plex/item/:id" element={<PlexItemPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
