import assert from "node:assert/strict";
import test from "node:test";

import type { Application } from "@repo/contracts/cabinet";

import {
  alfiTargets,
  cabinetHint,
  loadErrorHint,
} from "../src/features/alfi-assistant/model/cabinet-hint.ts";

function app(patch: Partial<Application>): Application {
  return {
    id: "app-1",
    number: "SC-1",
    status: "in_review",
    checksPassed: 1,
    requests: [],
    decision: null,
    deal: null,
    ...patch,
  } as Application;
}

test("на главной первой показывается заявка, где ход за клиентом", () => {
  const hint = cabinetHint("/", [
    app({ id: "a", number: "SC-1", status: "in_review" }),
    app({ id: "b", number: "SC-2", status: "needs_client" }),
  ]);
  assert.equal(hint.state, "needs_answer");
  assert.match(hint.title, /SC-2/);
  assert.deepEqual(
    hint.action && "href" in hint.action && hint.action.href,
    "/applications/b",
  );
});

test("без заявок Альфи предлагает подать первую", () => {
  const hint = cabinetHint("/", []);
  assert.equal(hint.state, "greeting");
  assert.equal(
    hint.action && "href" in hint.action && hint.action.href,
    "/applications/new",
  );
});

test("когда ход за банком, на главной нет кнопки, на других страницах ведёт к заявкам", () => {
  const apps = [app({ status: "in_review" })];
  assert.equal(cabinetHint("/", apps).action, undefined);
  const elsewhere = cabinetHint("/products", apps).action;
  assert.equal(elsewhere && "href" in elsewhere && elsewhere.href, "/");
});

test("в заявке с вопросом банка показывается сам вопрос и путь к ответу", () => {
  const hint = cabinetHint("/applications/app-1", [
    app({
      status: "needs_client",
      requests: [
        { id: "r", question: "Пришлите выписку" },
      ] as Application["requests"],
    }),
  ]);
  assert.equal(hint.message, "Пришлите выписку");
  assert.equal(
    hint.action && "target" in hint.action && hint.action.target,
    alfiTargets.nextStep,
  );
});

test("отказ ведёт к карточке решения, проверка сообщает число проверок", () => {
  const rejected = cabinetHint("/applications/app-1", [
    app({ status: "rejected" }),
  ]);
  assert.equal(
    rejected.action && "target" in rejected.action && rejected.action.target,
    alfiTargets.decision,
  );
  const checking = cabinetHint("/applications/app-1", [
    app({ checksPassed: 2 }),
  ]);
  assert.equal(checking.state, "checking");
  assert.match(checking.message, /2 из 3/);
});

test("черновик открывается с сохранёнными данными", () => {
  const hint = cabinetHint("/applications/app-1", [app({ status: "draft" })]);
  assert.equal(
    hint.action && "href" in hint.action && hint.action.href,
    "/applications/new?draft=1",
  );
});

test("одобренная заявка без сделки ведёт к карточке условий", () => {
  const hint = cabinetHint("/applications/app-1", [
    app({ status: "approved" }),
  ]);
  assert.equal(
    hint.action && "target" in hint.action && hint.action.target,
    alfiTargets.offerDecision,
  );
});

test("одобренная заявка на подписании ведёт на страницу подписи", () => {
  const hint = cabinetHint("/applications/app-1", [
    app({
      status: "approved",
      deal: { stage: "signing" } as Application["deal"],
    }),
  ]);
  assert.equal(
    hint.action && "href" in hint.action && hint.action.href,
    "/applications/app-1/sign",
  );
});

test("ошибка загрузки показывается как ошибка, а не как пустая очередь", () => {
  const hint = loadErrorHint("сервер недоступен");
  assert.equal(hint.state, "attention");
  assert.match(hint.message, /сервер недоступен/);
  assert.equal(hint.action, undefined);
});
