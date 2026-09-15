import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { SafetyGate } from "../components/SafetyGate";
import { ServiceTile } from "../components/ServiceTile";
import { featuredServices, getService, services } from "../data/services";
import { useSettings } from "../lib/settings";
import { teslaFullscreen } from "../lib/tesla";
import { startWatchSession } from "../lib/watch";

export function ServiceLaunchPage() {
  const { id = "" } = useParams();
  const { settings } = useSettings();
  const [warn, setWarn] = useState(false);
  const service = getService(id);

  if (!service) return <Navigate to="/apps" replace />;
  const app = service;

  const others = (app.category === "video" ? featuredServices() : services)
    .filter((item) => item.id !== app.id)
    .slice(0, 6);

  function openOfficial() {
    startWatchSession({
      deviceId: settings.plexClientId || "voltview-web",
      source: "app",
      contentId: app.id,
      title: app.name,
    }).catch(() => undefined);
    teslaFullscreen(app.url);
  }

  return (
    <div>
      {warn ? <SafetyGate title={`${service.name} nur im Stand`} resetKey={service.id} onConfirm={openOfficial} /> : null}
      <Link to="/apps" className="btn mb-4">
        <ArrowLeft className="h-4 w-4" />
        Apps
      </Link>
      <section className="card" style={{ background: `linear-gradient(160deg, ${service.accent} 0%, #111 78%)` }}>
        <h1 className="text-3xl font-bold tracking-tight">{service.name}</h1>
        <p className="mt-2 max-w-xl text-white/80">{service.blurb}</p>
        <button type="button" onClick={() => setWarn(true)} className="btn btn-primary mt-5">
          Öffnen
        </button>
      </section>
      {others.length ? (
        <div className="mt-6">
          <h2 className="mb-3 text-lg font-semibold">Weitere</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {others.map((item) => (
              <ServiceTile key={item.id} service={item} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
