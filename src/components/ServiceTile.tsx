import { Link } from "react-router-dom";
import type { Service } from "../data/services";

export function ServiceTile({ service, fill }: { service: Service; fill?: boolean }) {
  return (
    <Link
      to={`/apps/${service.id}`}
      aria-label={`${service.name} in VoltView öffnen`}
      className={`relative overflow-hidden rounded-2xl border border-white/10 text-left glow-ring ${
        fill ? "h-36 w-full" : "h-32 min-w-48 shrink-0"
      }`}
      style={{ background: `linear-gradient(145deg, ${service.accent} 0%, #0a0714 78%)` }}
    >
      <div className="tile-sheen absolute inset-0" />
      <div className="relative flex h-full flex-col justify-between p-4">
        <span className="text-[11px] uppercase tracking-[0.18em] text-white/70">{service.blurb}</span>
        <p className="text-xl font-bold leading-none">{service.name}</p>
      </div>
    </Link>
  );
}
