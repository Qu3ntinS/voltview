import { ArrowLeft, Maximize2 } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { teslaFullscreen } from "../lib/tesla";

export function Theater({
  backTo,
  eyebrow,
  title,
  children,
  sidebar,
}: {
  backTo: string;
  eyebrow: string;
  title: string;
  children: ReactNode;
  sidebar?: ReactNode;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  function enterFullscreen() {
    teslaFullscreen(window.location.href);
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-void">
      <div className="flex items-center gap-4 px-5 py-4">
        <Link to={backTo} className="inline-flex h-14 items-center gap-2 rounded-2xl bg-white/8 px-5 text-lg">
          <ArrowLeft className="h-5 w-5" />
          Zurück
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-[0.28em] text-volt-2">{eyebrow}</p>
          <h1 className="truncate font-display text-2xl font-bold">{title}</h1>
        </div>
        <div className="text-right">
          <button
            type="button"
            onClick={enterFullscreen}
            className="inline-flex h-14 items-center gap-2 rounded-2xl bg-volt px-5 font-semibold"
          >
            <Maximize2 className="h-5 w-5" />
            Tesla Vollbild
          </button>
          <p className="mt-1 max-w-48 text-[10px] leading-tight text-mist">
            youtube.com/redirect — im Auto „Go to site“ tippen
          </p>
        </div>
      </div>
      <div className="grid min-h-0 flex-1 gap-4 px-5 pb-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div
          data-theater-stage
          className="overflow-hidden rounded-[28px] border border-white/8 bg-black glow-ring"
        >
          {children}
        </div>
        {sidebar ? <aside className="hidden min-h-0 overflow-y-auto lg:block">{sidebar}</aside> : null}
      </div>
    </div>
  );
}
