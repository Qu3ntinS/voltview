export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="card max-w-lg glow-ring coming-soon">
      <p className="pair-kicker">Coming soon</p>
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
    </div>
  );
}
