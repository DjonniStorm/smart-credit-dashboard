"use client";

import {
  useId,
  useState,
  type CSSProperties,
  type JSX,
  type ReactNode,
} from "react";
import {
  notifications,
  type NotificationData,
} from "@mantine/notifications";

import classes from "./alfi.module.css";

export enum AlfiState {
  Idle = "idle",
  Greeting = "greeting",
  Explain = "explain",
  Checking = "checking",
  NeedsAnswer = "needs_answer",
  Success = "success",
  Attention = "attention",
}

export enum AlfiOperation {
  ApplicationCreated = "application_created",
  CheckingStarted = "checking_started",
  CheckCompleted = "check_completed",
  NeedsInfo = "needs_info",
  DocumentRejected = "document_rejected",
  OfferReady = "offer_ready",
  DecisionChanged = "decision_changed",
  ManualReview = "manual_review",
  ActionCompleted = "action_completed",
  ActionFailed = "action_failed",
}

export const alfiStateMeta: Record<
  AlfiState,
  { label: string; description: string }
> = {
  [AlfiState.Idle]: {
    label: "Альфи готов помочь",
    description: "Помощник ждёт следующего действия.",
  },
  [AlfiState.Greeting]: {
    label: "Альфи приветствует",
    description: "Помощник показывает начало следующего шага.",
  },
  [AlfiState.Explain]: {
    label: "Альфи объясняет",
    description: "Помощник объясняет рейтинг, запрос или изменение условий.",
  },
  [AlfiState.Checking]: {
    label: "Альфи проверяет",
    description: "Система проверяет данные, документ или источник.",
  },
  [AlfiState.NeedsAnswer]: {
    label: "От вас нужен ответ",
    description: "Найдено поле или подтверждение, которое нужно уточнить.",
  },
  [AlfiState.Success]: {
    label: "Шаг завершён",
    description: "Подтверждение принятого ответа или завершённого действия.",
  },
  [AlfiState.Attention]: {
    label: "Нужна проверка",
    description: "Есть риск или фактор, который требует внимания сотрудника.",
  },
};

export const alfiOperationState: Record<AlfiOperation, AlfiState> = {
  [AlfiOperation.ApplicationCreated]: AlfiState.Greeting,
  [AlfiOperation.CheckingStarted]: AlfiState.Checking,
  [AlfiOperation.CheckCompleted]: AlfiState.Explain,
  [AlfiOperation.NeedsInfo]: AlfiState.NeedsAnswer,
  [AlfiOperation.DocumentRejected]: AlfiState.Attention,
  [AlfiOperation.OfferReady]: AlfiState.Success,
  [AlfiOperation.DecisionChanged]: AlfiState.Explain,
  [AlfiOperation.ManualReview]: AlfiState.Attention,
  [AlfiOperation.ActionCompleted]: AlfiState.Success,
  [AlfiOperation.ActionFailed]: AlfiState.Attention,
};

export const alfiStateAssets: Record<AlfiState, string> = {
  [AlfiState.Idle]: "/alfi/pixel-scout/states/idle.svg",
  [AlfiState.Greeting]: "/alfi/pixel-scout/states/greeting.svg",
  [AlfiState.Explain]: "/alfi/pixel-scout/states/explain.svg",
  [AlfiState.Checking]: "/alfi/pixel-scout/states/checking.svg",
  [AlfiState.NeedsAnswer]: "/alfi/pixel-scout/states/needs-answer.svg",
  [AlfiState.Success]: "/alfi/pixel-scout/states/success.svg",
  [AlfiState.Attention]: "/alfi/pixel-scout/states/attention.svg",
};

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
  const defaultSrc = assetBasePath
    ? `${assetBasePath.replace(/\/$/, "")}/${state}.svg`
    : alfiStateAssets[state];
  const resolvedSrc = src ?? defaultSrc;
  const primaryFailed = failedPrimarySrc === resolvedSrc;
  const fallbackAvailable =
    fallbackSrc !== undefined && failedFallbackSrc !== fallbackSrc;
  const currentSrc = primaryFailed
    ? fallbackAvailable
      ? fallbackSrc
      : undefined
    : resolvedSrc;
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
            if (currentSrc === resolvedSrc) setFailedPrimarySrc(currentSrc);
            else setFailedFallbackSrc(currentSrc);
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

export type AlfiShowOptions = Omit<NotificationData, "message"> & {
  operation: AlfiOperation;
  message: ReactNode;
  raw?: string;
  state?: AlfiState;
  alfiSrc?: string;
  alfiFallbackSrc?: string;
  alfiSize?: number | string;
};

export type AlfiUpdateOptions = AlfiShowOptions & { id: string };

type AlfiNotificationContentProps = {
  state: AlfiState;
  message: ReactNode;
  raw?: string;
  src?: string;
  fallbackSrc?: string;
  size?: number | string;
};

function AlfiNotificationContent({
  state,
  message,
  raw,
  src,
  fallbackSrc,
  size,
}: AlfiNotificationContentProps): JSX.Element {
  return (
    <div
      className={classes.notification}
      data-alfi-raw={raw === undefined ? "absent" : "available"}
    >
      <Alfi
        state={state}
        src={src}
        fallbackSrc={fallbackSrc}
        size={size ?? 48}
      />
      <div className={classes.notificationCopy}>
        <span className={classes.notificationState}>
          {alfiStateMeta[state].label}
        </span>
        <span className={classes.notificationMessage}>{message}</span>
      </div>
    </div>
  );
}

const rawByNotificationId = new Map<string, string>();

function showAlfiNotification(options: AlfiShowOptions): string {
  const {
    operation,
    state,
    message,
    raw,
    alfiSrc,
    alfiFallbackSrc,
    alfiSize,
    onClose,
    ...notification
  } = options;
  const resolvedState = state ?? alfiOperationState[operation];
  const id = notifications.show({
    ...notification,
    onClose: (closedNotification) => {
      rawByNotificationId.delete(closedNotification.id ?? "");
      onClose?.(closedNotification);
    },
    message: (
      <AlfiNotificationContent
        state={resolvedState}
        message={message}
        raw={raw}
        src={alfiSrc}
        fallbackSrc={alfiFallbackSrc}
        size={alfiSize}
      />
    ),
  });

  if (raw !== undefined) rawByNotificationId.set(id, raw);
  return id;
}

export const alfi = {
  show: showAlfiNotification,
  hide(id: string): void {
    rawByNotificationId.delete(id);
    notifications.hide(id);
  },
  update(options: AlfiUpdateOptions): string | undefined {
    const {
      operation,
      state,
      message,
      raw,
      alfiSrc,
      alfiFallbackSrc,
      alfiSize,
      onClose,
      ...notification
    } = options;
    const resolvedState = state ?? alfiOperationState[operation];
    const id = notifications.update({
      ...notification,
      onClose: (closedNotification) => {
        rawByNotificationId.delete(closedNotification.id ?? "");
        onClose?.(closedNotification);
      },
      message: (
        <AlfiNotificationContent
          state={resolvedState}
          message={message}
          raw={raw}
          src={alfiSrc}
          fallbackSrc={alfiFallbackSrc}
          size={alfiSize}
        />
      ),
    });
    if (id) {
      if (raw === undefined) rawByNotificationId.delete(id);
      else rawByNotificationId.set(id, raw);
    }
    return id;
  },
  clean(): void {
    rawByNotificationId.clear();
    notifications.clean();
  },
};
