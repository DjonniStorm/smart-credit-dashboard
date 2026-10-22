"use client";

import { useId, useState, type CSSProperties, type JSX } from "react";

import classes from "./alfi.module.css";

export type AlfiState =
  | "idle"
  | "greeting"
  | "explain"
  | "checking"
  | "needs_answer"
  | "success"
  | "attention";

export const alfiStateMeta: Record<
  AlfiState,
  { label: string; description: string }
> = {
  idle: {
    label: "Альфи готов помочь",
    description: "Помощник ждёт следующего действия.",
  },
  greeting: {
    label: "Альфи приветствует",
    description: "Помощник показывает начало следующего шага.",
  },
  explain: {
    label: "Альфи объясняет",
    description: "Помощник объясняет рейтинг, запрос или изменение условий.",
  },
  checking: {
    label: "Альфи проверяет",
    description: "Система проверяет данные, документ или источник.",
  },
  needs_answer: {
    label: "От вас нужен ответ",
    description: "Найдено поле или подтверждение, которое нужно уточнить.",
  },
  success: {
    label: "Шаг завершён",
    description: "Подтверждение принятого ответа или завершённого действия.",
  },
  attention: {
    label: "Нужна проверка",
    description: "Есть риск или фактор, который требует внимания сотрудника.",
  },
};

export type AlfiProps = {
  state?: AlfiState;
  /** Путь до выбранного SVG в public-ассетах приложения. */
  src?: string;
  /** Путь до спокойного fallback SVG, если основной ассет не загрузился. */
  fallbackSrc?: string;
  alt?: string;
  size?: number | string;
  className?: string;
};

/** Общий персонаж клиента и банковского АРМ. Решение по заявке не принимает. */
export function Alfi({
  state = "idle",
  src = "/alfi/pixel-scout/01-classic.svg",
  fallbackSrc,
  alt,
  size = 96,
  className,
}: AlfiProps): JSX.Element {
  const [failedSrc, setFailedSrc] = useState<string | undefined>();
  const descriptionId = useId();
  const meta = alfiStateMeta[state];
  const currentSrc = failedSrc === src ? fallbackSrc : failedSrc ? undefined : src;
  const style = { "--alfi-size": typeof size === "number" ? `${size}px` : size } as CSSProperties;

  return (
    <span
      className={[classes.root, className].filter(Boolean).join(" ")}
      data-state={state}
      style={style}
      title={meta.label}
    >
      {currentSrc ? (
        <img
          className={classes.image}
          src={currentSrc}
          alt={alt ?? `Альфи: ${meta.label.toLowerCase()}`}
          aria-describedby={descriptionId}
          onError={() => setFailedSrc(currentSrc)}
        />
      ) : (
        <span className={classes.fallback} role="img" aria-label={alt ?? `Альфи: ${meta.label.toLowerCase()}`}>
          <span className={classes.fallbackFace} aria-hidden />
          <span className={classes.fallbackCompass} aria-hidden />
        </span>
      )}
      <span id={descriptionId} className={classes.visuallyHidden}>
        {meta.description}
      </span>
    </span>
  );
}
