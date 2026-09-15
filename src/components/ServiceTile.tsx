import { Link } from "react-router-dom";
import type { Service } from "../data/services";

export function ServiceTile({ service }: { service: Service }) {
  return (
    <Link
      to={`/apps/${service.id}`}
      aria-label={`${service.name} in VoltView öffnen`}
      className="relative h-28 min-w-40 shrink-0 overflow-hidden rounded-xl border border-white/10 text-left"
      style={{ background: `linear-gradient(145deg, ${service.accent} 0%, #0a0714 78%)` }}
    >
      <div className="tile-sheen absolute inset-0" />
      <div className="relative flex h-full flex-col justify-between p-4">
        <span className="text-[11px] text-white/70">{service.blurb}</span>
        <div>
          <p className="text-lg font-semibold leading-none">{service.name}</p>
        </div>
      </div>
    </Link>
  );
}
