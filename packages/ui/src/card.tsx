import { type JSX, type ReactNode } from "react";

export function Card({
  className,
  title,
  children,
}: {
  className?: string;
  title: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <section className={className}>
      <h2>{title}</h2>
      <div>{children}</div>
    </section>
  );
}
