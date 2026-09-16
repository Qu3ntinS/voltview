import { describe, expect, test } from "bun:test";
import { isLanPlexHost, mapPlexResources, pickPlexConnection, plexAuthUrl, plexIdentity } from "./plexTv";

describe("plex.tv helpers", () => {
  test("builds the official auth hash URL", () => {
    const url = plexAuthUrl("volt-client", "ABCD");
    expect(url.startsWith("https://app.plex.tv/auth#?")).toBe(true);
    expect(url).toContain("clientID=volt-client");
    expect(url).toContain("code=ABCD");
  });

  test("sends product headers without leaking empty tokens", () => {
    const headers = plexIdentity("abc");
    expect(headers["X-Plex-Product"]).toBe("VoltView");
    expect(headers["X-Plex-Token"]).toBeUndefined();
    expect(plexIdentity("abc", "tok")["X-Plex-Token"]).toBe("tok");
  });

  test("keeps only media servers and prefers a public https connection", () => {
    const servers = mapPlexResources([
      { name: "Player", provides: "player", connections: [] },
      {
        name: "Home",
        provides: "server",
        clientIdentifier: "s1",
        owned: true,
        accessToken: "t",
        connections: [
          { uri: "http://192.168.1.9:32400", address: "192.168.1.9", port: 32400, local: true, relay: false, protocol: "http" },
          { uri: "https://home.plex.direct:32400", address: "1.2.3.4", port: 32400, local: false, relay: false, protocol: "https" },
          { uri: "https://relay.plex.direct:443", address: "relay", port: 443, local: false, relay: true, protocol: "https" },
        ],
      },
    ]);
    expect(servers).toHaveLength(1);
    expect(pickPlexConnection(servers[0])?.uri).toContain("home.plex.direct");
  });

  test("does not pick a LAN plex.direct URL for the cloud proxy", () => {
    expect(isLanPlexHost("https://192-168-1-9.abc123.plex.direct:32400")).toBe(true);
    expect(isLanPlexHost("https://1-2-3-4.abc123.plex.direct:32400")).toBe(false);
    const picked = pickPlexConnection({
      name: "NQ-Server",
      clientIdentifier: "s1",
      owned: true,
      accessToken: "t",
      connections: [
        {
          uri: "https://192-168-1-9.abc123.plex.direct:32400",
          address: "192.168.1.9",
          port: 32400,
          local: true,
          relay: false,
          protocol: "https",
        },
        {
          uri: "https://88-1-2-3.abc123.plex.direct:32400",
          address: "88.1.2.3",
          port: 32400,
          local: false,
          relay: false,
          protocol: "https",
        },
      ],
    });
    expect(picked?.uri).toContain("88-1-2-3");
  });
});
