import { Link } from "react-router-dom";

export function MediaCard({
  to,
  image,
  title,
  subtitle,
  badge,
  wide,
  fill,
}: {
  to: string;
  image?: string;
  title: string;
  subtitle?: string;
  badge?: string;
  wide?: boolean;
  fill?: boolean;
}) {
  const size = fill ? "h-64 w-full" : wide ? "h-44 w-80 shrink-0" : "h-64 w-44 shrink-0";
  return (
    <Link
      to={to}
      className={`group relative overflow-hidden rounded-2xl border border-white/5 bg-panel glow-ring ${size}`}
    >
      {image ? (
        <img src={image} alt={title} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-[linear-gradient(160deg,#3b0764,transparent_70%)]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
      {badge ? (
        <span className="absolute right-3 top-3 rounded-full bg-black/55 px-2 py-1 text-[11px] text-volt-2">
          {badge}
        </span>
      ) : null}
      <div className="absolute inset-x-0 bottom-0 p-3">
        <p className="line-clamp-2 text-sm font-semibold leading-snug">{title}</p>
        {subtitle ? <p className="mt-1 line-clamp-1 text-xs text-mist">{subtitle}</p> : null}
      </div>
    </Link>
  );
}
