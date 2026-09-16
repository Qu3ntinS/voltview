import { useEffect, type ReactNode } from "react";
import { isTeslaBrowser } from "../lib/tesla";

export function Theater({
  children,
  sidebar,
}: {
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
      <div className={`theater-layout${side ? " has-side" : ""}`}>
        <div data-theater-stage className="theater-stage">
          {children}
        </div>
        {side ? <aside className="theater-side">{side}</aside> : null}
      </div>
    </div>
  );
}
