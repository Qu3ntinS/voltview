import { ArrowLeft, Maximize2 } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { isTeslaBrowser, teslaFullscreen } from "../lib/tesla";

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

  const side = sidebar && !isTeslaBrowser() ? sidebar : null;

  return (
    <div className="theater">
      <div className="theater-bar">
        <Link to={backTo} className="btn theater-back">
          <ArrowLeft className="h-4 w-4" />
          Zurück
        </Link>
        <div className="theater-copy">
          <p className="tiny muted">{eyebrow}</p>
          <h1 className="theater-title">{title}</h1>
        </div>
        <button type="button" onClick={() => teslaFullscreen()} className="btn btn-primary">
          <Maximize2 className="h-4 w-4" />
          Vollbild
        </button>
      </div>
      <div className={`theater-layout${side ? " has-side" : ""}`}>
        <div data-theater-stage className="theater-stage">
          {children}
        </div>
        {side ? <aside className="theater-side">{side}</aside> : null}
      </div>
    </div>
  );
}
