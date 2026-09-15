import type { RadioStation } from "./api";

const ENDPOINTS = [
  "https://de1.api.radio-browser.info",
  "https://fi1.api.radio-browser.info",
  "https://all.api.radio-browser.info",
];

function mapStation(station: any): RadioStation {
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

async function radioGet(path: string) {
  let lastError: Error | null = null;
  for (const base of ENDPOINTS) {
    try {
      const res = await fetch(`${base}${path}`);
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

export const radioClient = {
  popular: async (country = "DE") => {
    const params = new URLSearchParams({
      limit: "40",
      hidebroken: "true",
      order: "clickcount",
      reverse: "true",
    });
    if (country) params.set("countrycode", country);
    const data = await radioGet(`/json/stations/search?${params.toString()}`);
    return { items: (data || []).map(mapStation) };
  },
  search: async (q: string) => {
    const params = new URLSearchParams({
      name: q,
      limit: "30",
      hidebroken: "true",
      order: "clickcount",
      reverse: "true",
    });
    const data = await radioGet(`/json/stations/search?${params.toString()}`);
    return { items: (data || []).map(mapStation) };
  },
};
