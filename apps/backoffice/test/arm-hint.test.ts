import assert from "node:assert/strict";
import test from "node:test";

import type { Application } from "@repo/contracts/application";

import {
  type GuidanceSource,
  armActionsTarget,
  armHint,
  loadErrorHint,
} from "../src/features/alfi-assistant/model/arm-hint.ts";

// Подменная getAlfiGuidance: запоминает контекст и отвечает предсказуемо.
const seen: Parameters<GuidanceSource>[0][] = [];
const guide: GuidanceSource = (context) => {
  seen.push(context);
  return {
    state: "explain",
    title: "Совет",
    message: "Сверьте факторы",
    action: "Выберите действие",
    safety: "",
  };
};

function app(patch: Partial<Application>): Application {
  return {
    id: "app-1",
    number: "SC-1",
    createdAt: "2026-10-23T10:00:00Z",
    status: "in_review",
    stage: "decision",
    waitingOn: "employee",
    hold: null,
    blocker: "",
    assigneeId: null,
    scoring: null,
    ...patch,
  } as Application;
}

test("в очереди Альфи ведёт к самой старой заявке, ждущей решения", () => {
  const hint = armHint(
    "/",
    [
      app({ id: "new", number: "SC-2", createdAt: "2026-10-23T12:00:00Z" }),
      app({ id: "old", number: "SC-1", createdAt: "2026-10-23T09:00:00Z" }),
    ],
    "an-1",
    guide,
  );
  assert.match(hint.title, /2/);
  assert.equal(
    hint.action && "href" in hint.action && hint.action.href,
    "/applications/old",
  );
});

test("чужие, приостановленные и ждущие клиента заявки не считаются", () => {
  const hint = armHint(
    "/",
    [
      app({ id: "a", assigneeId: "an-2" }),
      app({ id: "b", hold: { state: "paused" } as Application["hold"] }),
      app({ id: "c", waitingOn: "client" }),
    ],
    "an-1",
    guide,
  );
  assert.equal(hint.state, "idle");
  assert.equal(hint.action, undefined);
});

test("в заявке, где решение за сотрудником, кнопка ведёт к действиям", () => {
  const hint = armHint("/applications/app-1", [app({})], "an-1", guide);
  assert.equal(
    hint.action && "target" in hint.action && hint.action.target,
    armActionsTarget,
  );
});

test("в заявке ждущей клиента кнопки действий нет и сценарий сотрудника не вызывается", () => {
  const callsBefore = seen.length;
  const hint = armHint(
    "/applications/app-1",
    [
      app({
        waitingOn: "client",
        status: "needs_client",
        scoring: { recommendation: "manual_review" } as Application["scoring"],
      }),
    ],
    "an-1",
    guide,
  );
  assert.equal(hint.action, undefined);
  assert.equal(
    hint.message,
    "Запрос отправлен: клиент прикрепляет файлы и отвечает по нему. Когда он ответит, заявка вернётся на рассмотрение.",
  );
  assert.equal(seen.length, callsBefore);
});

test("ошибка загрузки очереди не выдаётся за разобранную очередь", () => {
  const hint = loadErrorHint("500");
  assert.equal(hint.state, "attention");
  assert.match(hint.message, /500/);
});
