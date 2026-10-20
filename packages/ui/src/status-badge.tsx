import { type JSX } from "react";

export function StatusBadge({
  ok,
  label,
}: {
  ok: boolean;
  label: string;
}): JSX.Element {
  return (
    <span style={{ color: ok ? "green" : "crimson" }}>
      {ok ? "●" : "○"} {label}
    </span>
  );
}
