import { useEffect, useRef } from "react";
import { endWatchSession, heartbeatWatchSession, startWatchSession, type WatchSource } from "./watch";

export function useWatchSession(opts: {
  deviceId: string;
  source: WatchSource;
  contentId: string;
  title: string;
  getSnapshot: () => { positionSec: number; durationSec: number; playing: boolean };
}) {
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    if (!opts.contentId) return undefined;
    let sessionId = "";
    let alive = true;

    startWatchSession({
      deviceId: opts.deviceId,
      source: opts.source,
      contentId: opts.contentId,
      title: optsRef.current.title || opts.contentId,
    })
      .then((session) => {
        if (!alive) {
          endWatchSession(session.id);
          return;
        }
        sessionId = session.id;
      })
      .catch(() => undefined);

    const timer = window.setInterval(() => {
      if (!sessionId) return;
      const snap = optsRef.current.getSnapshot();
      heartbeatWatchSession(sessionId, snap).catch(() => undefined);
    }, 8000);

    return () => {
      alive = false;
      window.clearInterval(timer);
      if (sessionId) endWatchSession(sessionId);
    };
  }, [opts.deviceId, opts.source, opts.contentId]);
}
