import type { Settings } from "./storage";

export type PairSettings = Partial<Settings>;

const JSONBLOB = "https://jsonblob.com/api/jsonBlob";

function isBlobId(id: string) {
  return id.length > 8;
}

export function addPath(id: string) {
  const base = import.meta.env.BASE_URL || "/";
  const prefix = base.endsWith("/") ? base.slice(0, -1) : base;
  return `${prefix}/add?r=${encodeURIComponent(id)}`;
}

export function addLandingPath() {
  const base = import.meta.env.BASE_URL || "/";
  const prefix = base.endsWith("/") ? base.slice(0, -1) : base;
  return `${prefix}/add`;
}

export function addUrl(id: string) {
  if (typeof window === "undefined") return addPath(id);
  return new URL(addPath(id), window.location.origin).href;
}

export function addLandingUrl() {
  if (typeof window === "undefined") return addLandingPath();
  return new URL(addLandingPath(), window.location.origin).href;
}

export function encodeImportHash(settings: PairSettings) {
  const json = JSON.stringify(settings);
  const bytes = new TextEncoder().encode(json);
  let bin = "";
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return `import=${btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
}

export function decodeImportHash(hash: string): PairSettings | null {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  const match = raw.match(/(?:^|&)import=([^&]+)/);
  if (!match) return null;
  try {
    const b64 = match[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
    const bin = atob(b64 + pad);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>;
    return pickSettings(parsed);
  } catch {
    return null;
  }
}

function pickSettings(input: Record<string, unknown>): PairSettings {
  const keys: (keyof Settings)[] = [
    "youtubeRegion",
    "youtubeClientId",
    "youtubeAccessToken",
    "plexToken",
    "plexClientId",
    "plexServerUri",
    "plexServerToken",
    "plexServerName",
  ];
  const next: PairSettings = {};
  for (const key of keys) {
    const value = input[key];
    if (typeof value === "string") next[key] = value;
  }
  return next;
}

async function readJson<T>(res: Response): Promise<T | null> {
  const type = res.headers.get("content-type") || "";
  if (type && !type.includes("json")) return null;
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function nativePairAvailable() {
  try {
    const res = await fetch("/api/health", { headers: { Accept: "application/json" } });
    if (!res.ok) return false;
    const data = await readJson<{ ok?: boolean; name?: string }>(res);
    return data?.ok === true && data?.name === "voltview";
  } catch {
    return false;
  }
}

async function blobCreate() {
  const res = await fetch(JSONBLOB, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ v: 1, settings: null, t: Date.now() }),
  });
  if (!res.ok) throw new Error("PAIR_CREATE_FAILED");
  const loc = res.headers.get("Location") || res.headers.get("location") || "";
  const id = loc.split("/").filter(Boolean).pop();
  if (!id) throw new Error("PAIR_CREATE_FAILED");
  return id;
}

async function blobGet(id: string) {
  const res = await fetch(`${JSONBLOB}/${id}`, { headers: { Accept: "application/json" } });
  if (res.status === 404) throw new Error("PAIR_NOT_FOUND");
  if (!res.ok) throw new Error("PAIR_READ_FAILED");
  return (await res.json()) as { settings?: PairSettings | null };
}

export const pair = {
  async create(): Promise<{ id: string; addUrl: string }> {
    if (await nativePairAvailable()) {
      try {
        const res = await fetch("/api/pair", { method: "POST", headers: { Accept: "application/json" } });
        const data = res.ok ? await readJson<{ id?: string }>(res) : null;
        if (data?.id) return { id: data.id, addUrl: addUrl(data.id) };
      } catch {
        // Static hosts (Vercel/Pages) often serve index.html for /api/* — use jsonblob instead.
      }
    }
    const id = await blobCreate();
    return { id, addUrl: addUrl(id) };
  },

  async status(id: string): Promise<{ ready: boolean; settings: PairSettings | null }> {
    if (!isBlobId(id)) {
      const res = await fetch(`/api/pair/${encodeURIComponent(id)}`);
      if (res.status === 404) throw new Error("PAIR_NOT_FOUND");
      if (!res.ok) throw new Error("PAIR_READ_FAILED");
      const data = (await res.json()) as { ready: boolean; settings: PairSettings | null };
      return { ready: data.ready, settings: data.settings };
    }
    const data = await blobGet(id);
    return { ready: Boolean(data.settings), settings: data.settings || null };
  },

  async submit(id: string, settings: PairSettings) {
    const payload = pickSettings(settings as Record<string, unknown>);
    if (!isBlobId(id)) {
      const res = await fetch(`/api/pair/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("PAIR_SEND_FAILED");
      return;
    }
    const res = await fetch(`${JSONBLOB}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ v: 1, settings: payload, t: Date.now() }),
    });
    if (!res.ok) throw new Error("PAIR_SEND_FAILED");
  },

  async consume(id: string) {
    if (!isBlobId(id)) {
      await fetch(`/api/pair/${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => undefined);
      return;
    }
    await fetch(`${JSONBLOB}/${id}`, { method: "DELETE" }).catch(() => undefined);
  },
};
