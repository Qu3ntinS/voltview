import { Elysia } from "elysia";
import { plexDispatch } from "../src/lib/plexDispatch";

function pass({ request }: { request: Request }) {
  return plexDispatch(request);
}

export const plexRoutes = new Elysia({ prefix: "/api/plex" })
  .all("/", pass)
  .all("/pin", pass)
  .all("/pin/:id", pass)
  .all("/resources", pass)
  .all("/libraries", pass)
  .all("/on-deck", pass)
  .all("/recent", pass)
  .all("/section/:key", pass)
  .all("/metadata/:id", pass)
  .all("/children/:id", pass)
  .all("/search", pass)
  .all("/image", pass)
  .all("/stream/:id", pass)
  .all("/file/:id", pass)
  .all("/asset", pass);
