import type { ReactNode } from "react";

export function Row({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-end justify-between gap-4 px-1">
        <h2 className="font-display text-2xl font-bold tracking-tight">{title}</h2>
        {action}
      </div>
      <div className="media-row flex gap-4 overflow-x-auto pb-2">{children}</div>
    </section>
  );
}
