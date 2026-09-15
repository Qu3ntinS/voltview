import { Elysia } from "elysia";

const RADIO_ENDPOINTS = [
  "https://de1.api.radio-browser.info",
  "https://fi1.api.radio-browser.info",
  "https://nl1.api.radio-browser.info",
];

const UA = "VoltView/1.0 (https://github.com/Qu3ntinS/voltview)";

async function radioGet(path: string) {
  let lastError: Error | null = null;
  for (const base of RADIO_ENDPOINTS) {
    try {
      const res = await fetch(`${base}${path}`, {
        headers: { "User-Agent": UA, Accept: "application/json" },
      });
      if (!res.ok) {
        lastError = new Error(`Radio ${res.status}`);
        continue;
      }
      return await res.json();
    } catch (error) {
      lastError = error as Error;
    }
  }
  throw lastError || new Error("Radio unavailable");
}

function mapStation(station: any) {
  return {
    id: station.stationuuid,
    name: station.name,
    url: station.url_resolved || station.url,
    favicon: station.favicon,
    country: station.country,
    tags: station.tags,
    bitrate: station.bitrate,
    codec: station.codec,
  };
}

export const radioRoutes = new Elysia({ prefix: "/api/radio" })
  .get("/popular", async ({ query, set }) => {
    try {
      const country = String(query.country || "");
      const params = new URLSearchParams({
        limit: "40",
        hidebroken: "true",
        order: "clickcount",
        reverse: "true",
      });
      if (country) params.set("countrycode", country);
      const data = await radioGet(`/json/stations/search?${params.toString()}`);
      return { items: (data || []).map(mapStation) };
    } catch (error) {
      set.status = 502;
      return { error: (error as Error).message, items: [] };
    }
  })
  .get("/play/:id", async ({ params, set }) => {
    try {
      const data = await radioGet(`/json/stations/byuuid/${params.id}`);
      const station = Array.isArray(data) ? data[0] : data;
      const streamUrl = station?.url_resolved || station?.url;
      if (!streamUrl) {
        set.status = 404;
        return { error: "Station not found" };
      }
      const res = await fetch(streamUrl, {
        headers: { "User-Agent": UA, Accept: "audio/*,*/*" },
      });
      if (!res.ok || !res.body) {
        set.status = 502;
        return { error: "Stream failed" };
      }
      return new Response(res.body, {
        headers: {
          "content-type": res.headers.get("content-type") || "audio/mpeg",
          "cache-control": "no-store",
        },
      });
    } catch (error) {
      set.status = 502;
      return { error: (error as Error).message };
    }
  })
  .get("/search", async ({ query, set }) => {
    try {
      const name = String(query.q || "").trim();
      if (!name) return { items: [] };
      const params = new URLSearchParams({
        name,
        limit: "30",
        hidebroken: "true",
        order: "clickcount",
        reverse: "true",
      });
      const data = await radioGet(`/json/stations/search?${params.toString()}`);
      return { items: (data || []).map(mapStation) };
    } catch (error) {
      set.status = 502;
      return { error: (error as Error).message, items: [] };
    }
  });
