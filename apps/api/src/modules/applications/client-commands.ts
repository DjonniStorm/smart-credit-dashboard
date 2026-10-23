import { createHash } from "node:crypto";

import {
  ConflictException,
  UnprocessableEntityException,
} from "@nestjs/common";

import type { ClientAction } from "@repo/contracts/client-actions";
import type {
  ApplicationWorkflow,
  WorkflowStatus,
} from "@repo/contracts/workflow";

import type { CommandEvent } from "./application-commands.ts";

export interface ClientCommandOutcome {
  application: ApplicationWorkflow;
  event: CommandEvent;
}

/** Демо-код подписи: стабилен для заявки, поэтому повторный запрос не ломает уже отправленный код. */
export function demoSignCode(applicationId: string): string {
  const digest = createHash("sha256").update(`sign:${applicationId}`).digest();
  return String(digest.readUInt32BE(0) % 1_000_000).padStart(6, "0");
}

function demoAccount(applicationId: string): string {
  const digest = createHash("sha256").update(`acc:${applicationId}`).digest();
  return `40702810${String(digest.readUInt32BE(0)).padStart(12, "0")}`;
}

function requireStatus(
  current: ApplicationWorkflow,
  allowed: WorkflowStatus[],
  message: string,
): void {
  if (!allowed.includes(current.status)) {
    throw new ConflictException(message);
  }
}

/**
 * Таблица переходов команд клиента по plan.md: NEEDS_INFO → UNDER_REVIEW,
 * OFFERED → ACCEPTED или CANCELLED, SIGNING → FUNDED. Переход
 * ACCEPTED → SIGNING делает система (`prepareContract`). Остальное даёт 409.
 */
export function runClientCommand(
  current: ApplicationWorkflow,
  action: ClientAction,
  now: string,
): ClientCommandOutcome {
  if (current.hold) {
    throw new ConflictException(
      "Заявка на ручной проверке банка, действия временно недоступны",
    );
  }

  const next: ApplicationWorkflow = { ...current, updatedAt: now };
  const base = { actionType: action.type };
  const changeStatus = (
    to: WorkflowStatus,
    title: string,
    comment: string | null = null,
  ): ClientCommandOutcome => {
    next.status = to;
    return {
      application: next,
      event: {
        kind: "status_changed",
        title,
        comment,
        metadata: { ...base, fromStatus: current.status, toStatus: to },
      },
    };
  };

  switch (action.type) {
    case "answer_request": {
      requireStatus(current, ["needs_client"], "Банк сейчас не ждёт ответа");
      next.clientReply = { ...action.answer, answeredAt: now };
      return changeStatus(
        "in_review",
        "Клиент ответил на запрос",
        action.answer.text,
      );
    }
    case "accept_offer": {
      requireStatus(
        current,
        ["approved", "counter_offer"],
        "Предложение сейчас нельзя принять",
      );
      next.deal = {
        offerKind: current.status === "counter_offer" ? "counter" : "initial",
        acceptedAt: now,
        codeRequestedAt: null,
        signedAt: null,
        disbursedAt: null,
        account: demoAccount(current.id),
      };
      return changeStatus("accepted", "Клиент принял условия");
    }
    case "decline_offer": {
      requireStatus(
        current,
        ["approved", "counter_offer"],
        "Предложение сейчас нельзя отклонить",
      );
      next.cancelledBy = "client";
      return changeStatus("cancelled", "Клиент отказался от предложения");
    }
    case "request_sign_code": {
      requireStatus(current, ["signing"], "Договор сейчас не ждёт подписи");
      if (current.deal) {
        next.deal = { ...current.deal, codeRequestedAt: now };
      }
      return {
        application: next,
        event: {
          kind: "action",
          title: "Отправлен код подписи",
          comment: null,
          metadata: base,
        },
      };
    }
    case "sign": {
      requireStatus(current, ["signing"], "Договор сейчас не ждёт подписи");
      if (!current.deal?.codeRequestedAt) {
        throw new ConflictException("Сначала запросите код подтверждения");
      }
      if (action.code !== demoSignCode(current.id)) {
        throw new UnprocessableEntityException("Неверный код подтверждения");
      }
      next.deal = { ...current.deal, signedAt: now, disbursedAt: now };
      return changeStatus("funded", "Договор подписан, кредит выдан");
    }
  }
}

/** Системный шаг ACCEPTED → SIGNING: договор подготовлен, клиент может запросить код. */
export function prepareContract(
  current: ApplicationWorkflow,
  now: string,
): ClientCommandOutcome {
  return {
    application: { ...current, status: "signing", updatedAt: now },
    event: {
      kind: "status_changed",
      title: "Договор подготовлен",
      comment: null,
      metadata: {
        actionType: "prepare_contract",
        fromStatus: current.status,
        toStatus: "signing",
      },
    },
  };
}
