"use client";

import { motion } from "motion/react";
import { type CSSProperties, type JSX } from "react";

import { t } from "./motion";
import classes from "./stage-rail.module.css";

type StageState = "done" | "current" | "action" | "next";

/**
 * Путь заявки: по сегменту на этап. Фирменный мотив системы.
 * Пройденные этапы чернильные, текущий красный.
 * waitingForClient красит текущий этап янтарным: ход за клиентом.
 */
export function StageRail({
  stages,
  current,
  waitingForClient = false,
  label = "Путь заявки",
}: {
  stages: readonly string[];
  current: number;
  waitingForClient?: boolean;
  label?: string;
}): JSX.Element {
  return (
    <div className={classes.root}>
      {/* Видна только на узкой дорожке; скринридер читает подписи списка. */}
      <p className={classes.caption} aria-hidden>
        Этап {current + 1} из {stages.length}: {stages[current]}
      </p>
      <ol
        className={classes.rail}
        style={{ "--stages": stages.length } as CSSProperties}
        aria-label={label}
      >
        {stages.map((stage, i) => {
          const state: StageState =
            i < current
              ? "done"
              : i === current
                ? waitingForClient
                  ? "action"
                  : "current"
                : "next";
          const fill = state === "done" ? 1 : state === "current" ? 0.5 : 0;
          return (
            <li
              key={stage}
              className={classes.item}
              data-state={state}
              aria-current={i === current ? "step" : undefined}
            >
              <span className={classes.segment} aria-hidden>
                <motion.span
                  className={classes.fill}
                  style={{ originX: 0 }}
                  initial={false}
                  animate={{ scaleX: fill }}
                  transition={t.stage}
                />
              </span>
              <span className={classes.label}>{stage}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
