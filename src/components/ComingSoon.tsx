export function ComingSoon({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="card max-w-lg glow-ring coming-soon">
      <p className="pair-kicker">Coming soon</p>
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <p className="muted mt-2">{body}</p>
    </div>
  );
}
