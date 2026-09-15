import { useEffect, useState } from "react";

export function BootScreen({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      window.setTimeout(() => setPhase(1), 180),
      window.setTimeout(() => setPhase(2), 900),
      window.setTimeout(onDone, 1700),
    ];
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [onDone]);

  return (
    <button
      type="button"
      onClick={onDone}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-void text-left"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(139,92,246,0.22),transparent_42%)]" />
      <div
        className="relative mb-6 h-20 w-20 rounded-[22px] border border-volt/40 bg-panel glow-ring transition-transform duration-700"
        style={{ transform: phase ? "scale(1)" : "scale(0.86)", opacity: phase ? 1 : 0.4 }}
      >
        <div className="absolute inset-0 rounded-[22px] bg-[linear-gradient(135deg,rgba(196,181,253,0.2),transparent)]" />
        <div className="flex h-full items-center justify-center font-display text-3xl font-extrabold text-volt-2">
          V
        </div>
      </div>
      <p className="relative font-display text-5xl font-extrabold tracking-tight text-foam">
        VoltView
      </p>
      <p className="relative mt-3 text-sm uppercase tracking-[0.35em] text-mist">
        {phase < 2 ? "Theater wird geladen" : "Bereit"}
      </p>
    </button>
  );
}
