"use client";

import { useId, useState, type CSSProperties, type JSX } from "react";

import {
  alfiStateAssets,
  alfiStateMeta,
  AlfiState,
} from "./alfi-state";
import classes from "./alfi.module.css";

export type AlfiProps = {
  state?: AlfiState;
  /** Путь до выбранного SVG в public-ассетах приложения. */
  src?: string;
  /** Базовый путь для семи стандартных SVG Альфи. */
  assetBasePath?: string;
  /** Путь до спокойного fallback SVG, если основной ассет не загрузился. */
  fallbackSrc?: string;
  alt?: string;
  size?: number | string;
  className?: string;
};

/** Общий персонаж клиента и банковского АРМ. Решение по заявке не принимает. */
export function Alfi({
  state = AlfiState.Idle,
  src,
  assetBasePath,
  fallbackSrc,
  alt,
  size = 96,
  className,
}: AlfiProps): JSX.Element {
  const [failedPrimarySrc, setFailedPrimarySrc] = useState<
    string | undefined
  >();
  const [failedFallbackSrc, setFailedFallbackSrc] = useState<
    string | undefined
  >();
  const descriptionId = useId();
  const meta = alfiStateMeta[state];
  const defaultSrc = getDefaultSource(state, assetBasePath);
  const resolvedSrc = src ?? defaultSrc;
  const currentSrc = getCurrentSource(
    resolvedSrc,
    fallbackSrc,
    failedPrimarySrc,
    failedFallbackSrc,
  );
  const style = {
    "--alfi-size": typeof size === "number" ? `${size}px` : size,
  } as CSSProperties;

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
          onError={() => {
            if (currentSrc === resolvedSrc) {
              setFailedPrimarySrc(currentSrc);
            } else {
              setFailedFallbackSrc(currentSrc);
            }
          }}
        />
      ) : (
        <span
          className={classes.fallback}
          role="img"
          aria-label={alt ?? `Альфи: ${meta.label.toLowerCase()}`}
        >
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

function getDefaultSource(
  state: AlfiState,
  assetBasePath: string | undefined,
): string {
  if (assetBasePath) {
    return `${assetBasePath.replace(/\/$/, "")}/${state}.svg`;
  }

  return alfiStateAssets[state];
}

function getCurrentSource(
  resolvedSrc: string,
  fallbackSrc: string | undefined,
  failedPrimarySrc: string | undefined,
  failedFallbackSrc: string | undefined,
): string | undefined {
  if (failedPrimarySrc !== resolvedSrc) {
    return resolvedSrc;
  }

  if (fallbackSrc !== undefined && failedFallbackSrc !== fallbackSrc) {
    return fallbackSrc;
  }

  return undefined;
}
