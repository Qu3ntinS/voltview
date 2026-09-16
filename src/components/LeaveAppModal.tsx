import type { Service } from "../data/services";

export function LeaveAppModal({
  service,
  onCancel,
  onConfirm,
}: {
  service: Service | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!service) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-6">
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-panel p-8 glow-ring">
        <p className="text-xs uppercase tracking-[0.28em] text-volt-2">App</p>
        <h2 className="mt-3 font-display text-3xl font-bold">{service.name}</h2>
        <div className="mt-8 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="h-14 rounded-2xl border border-white/10 bg-white/5 text-lg"
          >
            Zurück
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-14 rounded-2xl bg-volt text-lg font-semibold text-white"
          >
            {service.name} öffnen
          </button>
        </div>
      </div>
    </div>
  );
}
