"use client";

import { type JSX, type ReactNode } from "react";
import {
  notifications,
  type NotificationData,
} from "@mantine/notifications";

import { Alfi } from "./alfi-character";
import {
  alfiOperationState,
  alfiStateMeta,
  AlfiOperation,
  AlfiState,
} from "./alfi-state";
import classes from "./alfi.module.css";

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

export type AlfiPresetOptions = Omit<
  AlfiShowOptions,
  "message" | "operation" | "state"
>;

const defaultOperationByState: Readonly<Record<AlfiState, AlfiOperation>> = {
  [AlfiState.Idle]: AlfiOperation.ApplicationCreated,
  [AlfiState.Greeting]: AlfiOperation.ApplicationCreated,
  [AlfiState.Explain]: AlfiOperation.CheckCompleted,
  [AlfiState.Checking]: AlfiOperation.CheckingStarted,
  [AlfiState.NeedsAnswer]: AlfiOperation.NeedsInfo,
  [AlfiState.Success]: AlfiOperation.ActionCompleted,
  [AlfiState.Attention]: AlfiOperation.ManualReview,
};

type AlfiNotificationContentProps = {
  state: AlfiState;
  message: ReactNode;
  raw?: string;
  src?: string;
  fallbackSrc?: string;
  size?: number | string;
};

/** Управляет уведомлениями Альфи и скрывает служебные raw-данные от UI. */
export class AlfiNotificationManager {
  private readonly rawByNotificationId = new Map<string, string>();

  public show(options: AlfiShowOptions): string {
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
        this.removeRaw(closedNotification.id);
        onClose?.(closedNotification);
      },
      message: this.createContent({
        state: resolvedState,
        message,
        raw,
        src: alfiSrc,
        fallbackSrc: alfiFallbackSrc,
        size: alfiSize,
      }),
    });

    this.saveRaw(id, raw);
    return id;
  }

  public hide(id: string): void {
    this.removeRaw(id);
    notifications.hide(id);
  }

  public showState(
    state: AlfiState,
    message: ReactNode,
    options: AlfiPresetOptions = {},
  ): string {
    return this.show({
      ...options,
      operation: defaultOperationByState[state],
      state,
      message,
    });
  }

  public showGreeting(
    message: ReactNode,
    options?: AlfiPresetOptions,
  ): string {
    return this.showState(AlfiState.Greeting, message, options);
  }

  public showExplain(
    message: ReactNode,
    options?: AlfiPresetOptions,
  ): string {
    return this.showState(AlfiState.Explain, message, options);
  }

  public showChecking(
    message: ReactNode,
    options?: AlfiPresetOptions,
  ): string {
    return this.showState(AlfiState.Checking, message, options);
  }

  public showNeedsInfo(
    message: ReactNode,
    options?: AlfiPresetOptions,
  ): string {
    return this.showState(AlfiState.NeedsAnswer, message, options);
  }

  public showOfferReady(
    message: ReactNode,
    options?: AlfiPresetOptions,
  ): string {
    return this.show({
      ...options,
      operation: AlfiOperation.OfferReady,
      state: AlfiState.Success,
      message,
    });
  }

  public showSuccess(
    message: ReactNode,
    options?: AlfiPresetOptions,
  ): string {
    return this.showState(AlfiState.Success, message, options);
  }

  public showAttention(
    message: ReactNode,
    options?: AlfiPresetOptions,
  ): string {
    return this.showState(AlfiState.Attention, message, options);
  }

  public showFailure(
    message: ReactNode,
    options?: AlfiPresetOptions,
  ): string {
    return this.show({
      ...options,
      operation: AlfiOperation.ActionFailed,
      state: AlfiState.Attention,
      message,
    });
  }

  public showDocumentRejected(
    message: ReactNode,
    options?: AlfiPresetOptions,
  ): string {
    return this.show({
      ...options,
      operation: AlfiOperation.DocumentRejected,
      state: AlfiState.Attention,
      message,
    });
  }

  public update(options: AlfiUpdateOptions): string | undefined {
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
        this.removeRaw(closedNotification.id);
        onClose?.(closedNotification);
      },
      message: this.createContent({
        state: resolvedState,
        message,
        raw,
        src: alfiSrc,
        fallbackSrc: alfiFallbackSrc,
        size: alfiSize,
      }),
    });

    if (id) {
      this.saveRaw(id, raw);
    }

    return id;
  }

  public clean(): void {
    this.rawByNotificationId.clear();
    notifications.clean();
  }

  private createContent({
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

  private saveRaw(id: string, raw: string | undefined): void {
    if (raw === undefined) {
      this.removeRaw(id);
      return;
    }

    this.rawByNotificationId.set(id, raw);
  }

  private removeRaw(id: string | undefined): void {
    if (id === undefined) {
      return;
    }

    this.rawByNotificationId.delete(id);
  }
}

export const alfi = new AlfiNotificationManager();
