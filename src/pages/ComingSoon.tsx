import { ComingSoon } from "../components/ComingSoon";

const copy: Record<string, { title: string; body: string }> = {
  apps: {
    title: "Apps",
    body: "Netflix, Disney+ und die anderen Streaming-Apps kommen, sobald YouTube und Plex stehen.",
  },
  mirror: {
    title: "Screen Mirror",
    body: "Handy-Bildschirm auf den Tesla legen — folgt als Nächstes.",
  },
};

export function ComingSoonPage({ feature }: { feature: "apps" | "mirror" }) {
  const item = copy[feature];
  return <ComingSoon title={item.title} body={item.body} />;
}
