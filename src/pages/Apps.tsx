import { useMemo, useState } from "react";
import { ServiceTile } from "../components/ServiceTile";
import { serviceCategories, services, type Service } from "../data/services";

export function AppsPage() {
  const [filter, setFilter] = useState<Service["category"] | "all">("all");
  const visible = useMemo(
    () => (filter === "all" ? services : services.filter((s) => s.category === filter)),
    [filter]
  );

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Apps</h1>
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
          <ServiceTile key={service.id} service={service} fill />
        ))}
      </div>
    </div>
  );
}

function Chip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-10 rounded-lg px-4 text-sm ${
        active ? "bg-volt text-white" : "border border-white/10 bg-panel text-mist"
      }`}
    >
      {label}
    </button>
  );
}
