import assert from "node:assert/strict";
import test from "node:test";

import type { Application } from "@repo/contracts/cabinet";

import type { ApplicationDraft } from "../src/entities/application/model/draft.ts";
import {
  applicationAction,
  countApplications,
  focusAction,
  matchesFilter,
  resolveFocus,
} from "../src/entities/application/model/financing.ts";

function app(id: string, patch: Partial<Application> = {}): Application {
  return {
    id,
    status: "in_review",
    createdAt: "2026-01-01T00:00:00Z",
    requests: [],
    decision: null,
    deal: null,
    ...patch,
  } as Application;
}
const draft = { accountId: "current" } as ApplicationDraft;
const request = {
  id: "request",
  question: "Вопрос",
  why: "Причина",
  answer: null,
} as Application["requests"][number];

test("запрос, подпись и предложение приоритетнее ожидания и черновика", () => {
  const wait = app("wait");
  const sign = app("sign", {
    status: "approved",
    deal: { stage: "signing" } as Application["deal"],
  });
  const offer = app("offer", {
    status: "counter_offer",
    decision: { offer: {} } as Application["decision"],
  });
  const answer = app("answer", { status: "needs_client", requests: [request] });
  for (const [apps, expected] of [
    [[wait, offer, sign, answer], "answer"],
    [[offer, wait, sign], "sign"],
    [[wait, offer], "offer"],
  ] as const) {
    const focus = resolveFocus(apps, draft, null);
    assert.equal(focus.kind === "application" && focus.app.id, expected);
  }
  assert.equal(resolveFocus([wait], draft, null).kind, "draft");
});

test("счётчики исключают закрытые, blocked и неполные состояния из действий клиента", () => {
  const closed = app("closed", {
    status: "disbursed",
    deal: { stage: "signing" } as Application["deal"],
  });
  const blocked = app("blocked", { status: "blocked", requests: [request] });
  const incomplete = app("incomplete", { status: "needs_client" });
  const answer = app("answer", { status: "needs_client", requests: [request] });
  assert.deepEqual(countApplications([closed, blocked, incomplete, answer]), {
    all: 4,
    action: 1,
    review: 2,
    closed: 1,
  });
  assert.equal(applicationAction(closed).kind, "closed");
  assert.equal(applicationAction(blocked).kind, "blocked");
  assert.equal(applicationAction(incomplete).kind, "invalid");
});

test("подготовка договора и выдача не являются завершением", () => {
  for (const stage of ["offer", "disbursing"] as const) {
    const moving = app(stage, {
      status: "approved",
      deal: { stage } as Application["deal"],
    });
    assert.equal(applicationAction(moving).kind, "wait");
    assert.equal(matchesFilter(moving, "closed"), false);
  }
  const sign = app("sign", {
    status: "approved",
    deal: { stage: "signing" } as Application["deal"],
  });
  assert.equal(applicationAction(sign).href, "/applications/sign/sign");
});

test("ручной фокус сохраняется при завершении, при удалении возвращается автоматический", () => {
  const closed = app("one", { status: "rejected" });
  const answer = app("two", { status: "needs_client", requests: [request] });
  const focus = resolveFocus([closed, answer], null, "one");
  assert.equal(focus.kind === "application" && focus.app.id, "one");
  assert.equal(focusAction(focus).kind, "closed");
  const fallback = resolveFocus([answer], null, "one");
  assert.equal(fallback.kind === "application" && fallback.app.id, "two");
});

test("равный приоритет стабилен, updatedAt от комментария не меняет порядок", () => {
  const a = app("a", {
    updatedAt: "2030-01-01",
    status: "needs_client",
    requests: [request],
  });
  const b = app("b", {
    updatedAt: "2020-01-01",
    status: "needs_client",
    requests: [request],
  });
  const focus = resolveFocus([b, a], null, null);
  assert.equal(focus.kind === "application" && focus.app.id, "a");
  assert.equal(applicationAction(a).description, request.question);
  assert.equal(applicationAction(a).why, request.why);
});

test("без заявок открывается подбор, черновик не становится отправленной заявкой", () => {
  const focus = resolveFocus([], null, null);
  assert.equal(focus.kind, "empty");
  assert.equal(focusAction(focus).href, "/products");
  assert.equal(resolveFocus([], draft, "draft").kind, "draft");
  assert.equal(resolveFocus([], null, "draft").kind, "empty");
  assert.deepEqual(countApplications([]), {
    all: 0,
    action: 0,
    review: 0,
    closed: 0,
  });
});

test("серверный draft не попадает в отправленные заявки и автоматический фокус", () => {
  const serverDraft = app("server-draft", { status: "draft" });
  assert.deepEqual(countApplications([serverDraft]), {
    all: 0,
    action: 0,
    review: 0,
    closed: 0,
  });
  assert.equal(matchesFilter(serverDraft, "all"), false);
  assert.equal(resolveFocus([serverDraft], null, null).kind, "empty");
});
