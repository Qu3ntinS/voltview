import { ArrowLeft } from "lucide-react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ServiceTile } from "../components/ServiceTile";
import { featuredServices, getService, services } from "../data/services";
import { useSettings } from "../lib/settings";
import { startWatchSession } from "../lib/watch";

export function ServiceLaunchPage() {
  const { id = "" } = useParams();
  const { settings } = useSettings();
  const service = getService(id);

  if (!service) return <Navigate to="/apps" replace />;

  const others = (service.category === "video" ? featuredServices() : services)
    .filter((item) => item.id !== service.id)
    .slice(0, 6);

  function openOfficial() {
    startWatchSession({
      deviceId: settings.plexClientId || "voltview-web",
      source: "app",
      contentId: service!.id,
      title: service!.name,
    }).catch(() => undefined);
    window.location.href = service!.url;
  }

  return (
    <div>
      <Link to="/apps" className="mb-5 inline-flex h-12 items-center gap-2 rounded-2xl bg-white/5 px-4">
        <ArrowLeft className="h-4 w-4" />
        Alle Dienste
      </Link>
      <section
        className="overflow-hidden rounded-[28px] border border-white/8 p-8 glow-ring"
        style={{ background: `linear-gradient(145deg, ${service.accent} 0%, #0a0714 72%)` }}
      >
        <p className="text-xs uppercase tracking-[0.28em] text-white/70">Streaming-Dienst</p>
        <h1 className="mt-3 font-display text-5xl font-extrabold">{service.name}</h1>
        <p className="mt-4 max-w-2xl text-lg text-white/80">
          {service.blurb}. VoltView öffnet deinen eigenen {service.name}-Account — so wie Netflix,
          Disney+ und Prime. Den Katalog spielt der offizielle Dienst, nicht wir.
        </p>
        <button
          type="button"
          onClick={openOfficial}
          className="mt-8 inline-flex h-16 items-center rounded-2xl bg-white px-8 text-lg font-semibold text-black"
        >
          {service.name} öffnen
        </button>
        <p className="mt-4 text-sm text-white/65">
          Eigenes Player-UI gibt es bei YouTube und Plex. Hier zählt VoltView den App-Start fürs
          spätere Abo-Modell.
        </p>
      </section>
      {others.length ? (
        <div className="mt-8">
          <h2 className="mb-4 font-display text-2xl font-bold">Weitere Dienste</h2>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {others.map((item) => (
              <ServiceTile key={item.id} service={item} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
