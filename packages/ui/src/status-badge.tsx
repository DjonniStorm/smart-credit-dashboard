import { IconCircleCheck, IconCircleX } from "@tabler/icons-react";
import { type JSX } from "react";

import { ToneBadge } from "./tone-badge";

/** Да/нет-статус: состояние сервиса, результат проверки. */
export function StatusBadge({
  ok,
  label,
}: {
  ok: boolean;
  label: string;
}): JSX.Element {
  return (
    <ToneBadge
      tone={ok ? "success" : "danger"}
      icon={ok ? IconCircleCheck : IconCircleX}
    >
      {label}
    </ToneBadge>
  );
}
