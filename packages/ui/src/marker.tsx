"use client";

import { motion } from "motion/react";
import { type JSX, type ReactNode } from "react";

import classes from "./marker.module.css";
import { dur, ease } from "./motion";

/** Линия маркера под фразой со следующим шагом. Одна на экран. */
export function Marker({ children }: { children: ReactNode }): JSX.Element {
  return (
    <span className={classes.mark}>
      <motion.span
        aria-hidden
        className={classes.ink}
        style={{ originX: 0 }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: dur.slow, ease: ease.standard, delay: 0.2 }}
      />
      <span className={classes.text}>{children}</span>
    </span>
  );
}
