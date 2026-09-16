import { describe, expect, test } from "bun:test";
import { plexRoutePath } from "./plexDispatch";

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
