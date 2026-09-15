import { ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

export function SafetyGate({ children, title }: { children: ReactNode; title: string }) {
  const [accepted, setAccepted] = useState(false);

  if (accepted) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/95 p-6">
      <div className="w-full max-w-xl rounded-[28px] border border-volt/30 bg-panel p-8 glow-ring">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-volt/20 text-volt-2">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <p className="text-xs uppercase tracking-[0.28em] text-volt-2">Sicherheit</p>
        <h2 className="mt-2 font-display text-3xl font-bold">{title}</h2>
        <p className="mt-4 text-lg leading-relaxed text-mist">
          Bitte nur im Stand nutzen. Den Blick vom Verkehr abwenden ist gefährlich und kann gegen
          geltendes Recht verstoßen. VoltView ist für Beifahrer und Ladepausen, nicht für den
          Fahrer während der Fahrt.
        </p>
        <button
          type="button"
          onClick={() => setAccepted(true)}
          className="mt-8 h-16 w-full rounded-2xl bg-volt text-lg font-semibold"
        >
          Verstanden, nur im Stand — weiter
        </button>
      </div>
    </div>
  );
}
