import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { Seo } from "./components/Seo";
import "./index.css";
import { SettingsProvider } from "./lib/settings";
import { ensureTeslaVideoUnlock } from "./lib/tesla";

const basename = import.meta.env.BASE_URL === "/" ? undefined : import.meta.env.BASE_URL.replace(/\/$/, "");

if (!ensureTeslaVideoUnlock()) {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <SettingsProvider>
        <BrowserRouter basename={basename}>
          <Seo />
          <App />
        </BrowserRouter>
      </SettingsProvider>
    </StrictMode>,
  );
}
