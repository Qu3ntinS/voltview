export function PlayerLoading({
  title,
  subtitle = "Laden…",
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="player-loading" role="status" aria-live="polite">
      <div className="player-loading-mark">VV</div>
      <div className="player-loading-ring" />
      <p className="player-loading-brand">VoltView</p>
      <p className="player-loading-title">{title || "YouTube"}</p>
      <p className="player-loading-sub">{subtitle}</p>
    </div>
  );
}
