import type { Application } from "@repo/contracts/application";

import { stageBadge } from "../model/queue";
import classes from "./stage-badge.module.css";

/** Бейдж этапа: тон по светлоте фона и всегда подпись словами. */
export function StageBadge({ app }: { app: Application }) {
  const { label, tone } = stageBadge(app);
  return (
    <span className={classes.badge} data-tone={tone}>
      {label}
    </span>
  );
}
