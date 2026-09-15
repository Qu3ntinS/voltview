import { useMemo, useState } from "react";
import { LeaveAppModal } from "../components/LeaveAppModal";
import { ServiceTile } from "../components/ServiceTile";
import { serviceCategories, services, type Service } from "../data/services";
import { useSettings } from "../lib/settings";
import { startWatchSession } from "../lib/watch";

export function AppsPage() {
  const { settings } = useSettings();
  const [filter, setFilter] = useState<Service["category"] | "all">("all");
  const [leaving, setLeaving] = useState<Service | null>(null);
  const visible = useMemo(
    () => (filter === "all" ? services : services.filter((s) => s.category === filter)),
    [filter]
  );

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.28em] text-volt-2">Launcher</p>
        <h1 className="mt-2 font-display text-4xl font-extrabold">Alle Dienste</h1>
        <p className="mt-3 max-w-2xl text-mist">
          Netflix, Disney+, Prime und die deutschen Mediatheken öffnen sich mit deinem eigenen
          Account. VoltView hostet deren Katalog nicht und umgeht keine Sperren.
        </p>
      </div>
      <div className="mb-6 flex flex-wrap gap-2">
        <Chip active={filter === "all"} onClick={() => setFilter("all")} label="Alle" />
        {serviceCategories.map((cat) => (
          <Chip
            key={cat.id}
            active={filter === cat.id}
            onClick={() => setFilter(cat.id)}
            label={cat.label}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {visible.map((service) => (
          <ServiceTile key={service.id} service={service} onOpen={setLeaving} />
        ))}
      </div>
      <LeaveAppModal
        service={leaving}
        onCancel={() => setLeaving(null)}
        onConfirm={() => {
          if (!leaving) return;
          startWatchSession({
            deviceId: settings.plexClientId || "voltview-web",
            source: "app",
            contentId: leaving.id,
            title: leaving.name,
          }).catch(() => undefined);
          window.location.href = leaving.url;
        }}
      />
    </div>
  );
}

function Chip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-12 rounded-2xl px-5 text-sm ${
        active ? "bg-volt text-white" : "border border-white/10 bg-panel text-mist"
      }`}
    >
      {label}
    </button>
  );
}
