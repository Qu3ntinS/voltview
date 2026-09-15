export const PLEX_TV = "https://plex.tv/api/v2";
export const PLEX_PRODUCT = "VoltView";
export const PLEX_VERSION = "1.0.0";

export type PlexPin = {
  id: number;
  code: string;
  authUrl: string;
  linkUrl: string;
};

export type PlexServerInfo = {
  name: string;
  clientIdentifier: string;
  owned: boolean;
  accessToken: string;
  connections: {
    uri: string;
    address: string;
    port: number;
    local: boolean;
    relay: boolean;
    protocol: string;
  }[];
};

export function plexIdentity(clientId: string, token?: string) {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "X-Plex-Client-Identifier": clientId || "voltview-web",
    "X-Plex-Product": PLEX_PRODUCT,
    "X-Plex-Version": PLEX_VERSION,
    "X-Plex-Platform": "Web",
    "X-Plex-Device": "VoltView",
    "X-Plex-Device-Name": "VoltView",
    "X-Plex-Model": "bundled",
  };
  if (token) headers["X-Plex-Token"] = token;
  return headers;
}

export function plexAuthUrl(clientId: string, code: string) {
  const params = new URLSearchParams({
    clientID: clientId,
    code,
    "context[device][product]": PLEX_PRODUCT,
  });
  return `https://app.plex.tv/auth#?${params.toString()}`;
}

export function pickPlexConnection(server: PlexServerInfo) {
  return (
    server.connections.find((c) => !c.relay && c.uri.startsWith("https")) ||
    server.connections.find((c) => c.local && c.uri.startsWith("http")) ||
    server.connections.find((c) => !c.relay) ||
    server.connections[0]
  );
}

async function plexTv(path: string, clientId: string, token?: string, init?: RequestInit) {
  const res = await fetch(`${PLEX_TV}${path}`, {
    ...init,
    headers: {
      ...plexIdentity(clientId, token),
      ...(init?.headers || {}),
    },
  });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    throw new Error(data?.error || data?.message || `Plex.tv ${res.status}`);
  }
  return data;
}

export async function plexCreatePin(clientId: string): Promise<PlexPin> {
  const data = await plexTv("/pins?strong=true", clientId, undefined, { method: "POST" });
  return {
    id: data.id,
    code: data.code,
    authUrl: plexAuthUrl(clientId, data.code),
    linkUrl: "https://plex.tv/link",
  };
}

export async function plexReadPin(clientId: string, id: number) {
  const data = await plexTv(`/pins/${id}`, clientId);
  return {
    id: data.id,
    code: data.code,
    authToken: (data.authToken as string | null) || null,
  };
}

export function mapPlexResources(data: unknown): PlexServerInfo[] {
  const list = Array.isArray(data) ? data : [];
  return list
    .filter((item) => item?.provides && String(item.provides).includes("server"))
    .map((item) => ({
      name: item.name,
      clientIdentifier: item.clientIdentifier,
      owned: Boolean(item.owned),
      accessToken: item.accessToken,
      connections: (item.connections || []).map((c: any) => ({
        uri: c.uri,
        address: c.address,
        port: c.port,
        local: Boolean(c.local),
        relay: Boolean(c.relay),
        protocol: c.protocol,
      })),
    }));
}

export async function plexListResources(clientId: string, token: string): Promise<{ servers: PlexServerInfo[] }> {
  if (!token) throw new Error("NO_PLEX_TOKEN");
  const data = await plexTv("/resources?includeHttps=1&includeRelay=1", clientId, token);
  return { servers: mapPlexResources(data) };
}
