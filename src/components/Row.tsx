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
    <section className="mb-5">
      <div className="mb-2 flex items-end justify-between gap-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        {action}
      </div>
      <div className="media-row flex gap-4 overflow-x-auto pb-2">{children}</div>
    </section>
  );
}
