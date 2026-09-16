import { ComingSoon } from "../components/ComingSoon";

const titles = {
  apps: "Apps",
  mirror: "Screen Mirror",
} as const;

export function ComingSoonPage({ feature }: { feature: keyof typeof titles }) {
  return <ComingSoon title={titles[feature]} />;
}
