import { Link } from "react-router-dom";
import type { Service } from "../data/services";

export function ServiceTile({ service }: { service: Service }) {
  return (
    <Link
      to={`/apps/${service.id}`}
      className="relative h-36 min-w-52 shrink-0 overflow-hidden rounded-3xl border border-white/8 text-left glow-ring"
      style={{ background: `linear-gradient(145deg, ${service.accent} 0%, #0a0714 78%)` }}
    >
      <div className="tile-sheen absolute inset-0" />
      <div className="relative flex h-full flex-col justify-between p-4">
        <span className="text-[11px] uppercase tracking-[0.22em] text-white/70">{service.blurb}</span>
        <div>
          <p className="font-display text-2xl font-bold leading-none">{service.name}</p>
          <p className="mt-2 text-xs text-white/70">Offizieller Account</p>
        </div>
      </div>
    </Link>
  );
}
