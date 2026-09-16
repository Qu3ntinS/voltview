import type { ReactNode } from "react";
import { useEffect, useState } from "react";

export function SafetyGate({
  children,
  title,
  resetKey,
  onConfirm,
}: {
  children?: ReactNode;
  title: string;
  resetKey?: string;
  onConfirm?: () => void;
}) {
  const [accepted, setAccepted] = useState(() => {
    if (typeof window === "undefined") return false;
    return /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
  });

  useEffect(() => {
    setAccepted(false);
  }, [resetKey]);

  if (accepted) return children ? <>{children}</> : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#05030a]/80 p-4">
      <div className="card w-full max-w-md glow-ring">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="muted mt-2">Nur im Stand.</p>
        <button
          type="button"
          className="btn btn-primary mt-5 w-full"
          onClick={() => {
            setAccepted(true);
            onConfirm?.();
          }}
        >
          Verstanden
        </button>
      </div>
    </div>
  );
}
