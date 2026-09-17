import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export function TeslaOnlyPlayback({
  backTo,
  eyebrow,
  title,
  poster,
}: {
  backTo: string;
  eyebrow: string;
  title: string;
  poster?: string;
}) {
  return (
    <div className="player-stage is-notice">
      {poster ? <img className="player-video" src={poster} alt="" /> : <div className="player-video" />}
      <div className="player-top">
        <Link to={backTo} className="player-back">
          <ArrowLeft className="h-5 w-5" />
          Zurück
        </Link>
        <div className="player-heading">
          <p className="player-kicker">{eyebrow}</p>
          <h1 className="player-title">{title}</h1>
        </div>
      </div>
      <p className="player-notice">
        Wiedergabe nur im Tesla.
        <span>Hier Browse und Sync.</span>
      </p>
    </div>
  );
}
