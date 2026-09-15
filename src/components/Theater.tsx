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

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-void">
      <div className="flex items-center gap-2 px-3 py-2">
        <Link to={backTo} className="btn">
          <ArrowLeft className="h-4 w-4" />
          Zurück
        </Link>
        <div className="min-w-0 flex-1">
          <p className="tiny muted">{eyebrow}</p>
          <h1 className="truncate text-base font-semibold">{title}</h1>
        </div>
        <button type="button" onClick={() => teslaFullscreen()} className="btn btn-primary">
          <Maximize2 className="h-4 w-4" />
          Vollbild
        </button>
      </div>
      <div className="grid min-h-0 flex-1 gap-3 px-3 pb-3 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div data-theater-stage className="overflow-hidden rounded-xl border border-line bg-black">
          {children}
        </div>
        {sidebar ? <aside className="hidden min-h-0 overflow-y-auto lg:block">{sidebar}</aside> : null}
      </div>
    </div>
  );
}
