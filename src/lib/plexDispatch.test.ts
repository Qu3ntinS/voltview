import { describe, expect, test } from "bun:test";
import { plexAuthQuery, plexClientFileUrl } from "./api";
import { plexPlaybackUris, plexRoutePath, plexStartUrl } from "./plexDispatch";

describe("plexRoutePath", () => {
  test("reads op + key so Vercel does not need nested /section/:id", () => {
    expect(plexRoutePath(new URL("http://x/api/plex?op=section&key=1"))).toBe("/section/1");
    expect(plexRoutePath(new URL("http://x/api/plex?op=stream&id=99"))).toBe("/stream/99");
    expect(plexRoutePath(new URL("http://x/api/plex?op=file&id=99"))).toBe("/file/99");
    expect(plexRoutePath(new URL("http://x/api/plex?op=metadata&id=99"))).toBe("/metadata/99");
    expect(plexRoutePath(new URL("http://x/api/plex?op=image"))).toBe("/image");
    expect(plexRoutePath(new URL("http://x/api/plex?op=libraries"))).toBe("/libraries");
  });

  test("reads Vercel rewrite voltPath including split segments", () => {
    expect(plexRoutePath(new URL("http://x/api/plex?voltPath=section/1"))).toBe("/section/1");
    const split = new URL("http://x/api/plex");
    split.searchParams.append("voltPath", "section");
    split.searchParams.append("voltPath", "1");
    expect(plexRoutePath(split)).toBe("/section/1");
  });

  test("keeps classic path routes for the bun server", () => {
    expect(plexRoutePath(new URL("http://x/api/plex/section/1"))).toBe("/section/1");
    expect(plexRoutePath(new URL("http://x/api/plex/libraries"))).toBe("/libraries");
  });
});

describe("plex photo query encoding", () => {
  test("keeps slashes in thumb paths", () => {
    const path = "/library/metadata/1/thumb/2";
    expect(encodeURI(path)).toBe(path);
    expect(new URLSearchParams({ url: path }).toString()).toContain("%2F");
  });
});

describe("plex playback URIs", () => {
  test("skips LAN hosts in the cloud and remuxes to mp4", () => {
    expect(
      plexPlaybackUris(
        ["https://192-168-1-9.abc.plex.direct:32400", "https://88-1-2-3.abc.plex.direct:32400"],
        true,
      ),
    ).toEqual(["https://88-1-2-3.abc.plex.direct:32400"]);
    const start = plexStartUrl(
      "https://88-1-2-3.abc.plex.direct:32400",
      "9",
      { clientId: "cid", serverToken: "tok" },
      "mp4",
      "remux",
    );
    expect(start.pathname.endsWith("/start.mp4")).toBe(true);
    expect(start.searchParams.get("directStream")).toBe("1");
    expect(start.searchParams.get("protocol")).toBe("http");
    expect(start.searchParams.get("X-Plex-Client-Profile-Extra") || "").toContain("container=mp4");
    expect(plexPlaybackUris(["https://192-168-1-9.abc.plex.direct:32400"], true)).toEqual([]);
  });
});

describe("plexAuthQuery", () => {
  test("puts server identity on media URLs", () => {
    const query = plexAuthQuery({
      youtubeApiKey: "",
      youtubeRegion: "DE",
      youtubeClientId: "",
      youtubeAccessToken: "",
      plexToken: "tok",
      plexClientId: "cid",
      plexServerUri: "https://abc.plex.direct:32400",
      plexServerToken: "stok",
      plexServerName: "Home",
      plexServerId: "sid",
    });
    expect(query).toContain("plexServerId=sid");
    expect(query).toContain("plexServerName=Home");
  });

  test("builds a direct Plex start.mp4 URL for the phone", () => {
    const url = plexClientFileUrl(
      {
        youtubeApiKey: "",
        youtubeRegion: "DE",
        youtubeClientId: "",
        youtubeAccessToken: "",
        plexToken: "tok",
        plexClientId: "cid",
        plexServerUri: "https://abc.plex.direct:32400",
        plexServerToken: "stok",
        plexServerName: "Home",
        plexServerId: "sid",
      },
      "42",
    );
    expect(url.startsWith("https://abc.plex.direct:32400/video/:/transcode/universal/start.mp4")).toBe(true);
    expect(url).toContain("path=%2Flibrary%2Fmetadata%2F42");
    expect(url).toContain("X-Plex-Token=stok");
  });
});
