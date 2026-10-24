import assert from "node:assert/strict";
import test from "node:test";

import type { Application } from "@repo/contracts/cabinet";

import {
  type Roadmap,
  type RoadmapStep,
  buildRoadmap,
} from "../src/entities/application/model/roadmap";

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

function stepAt(map: Roadmap, index: number): RoadmapStep {
  const step = map.steps[index];
  assert.ok(step);
  return step;
}

test("карта из шести шагов в порядке этапов", () => {
  const map = buildRoadmap(app({}));
  assert.deepEqual(
    map.steps.map((step) => step.title),
    ["Заявка", "Проверка данных", "Оценка", "Решение", "Подписание", "Выдача"],
  );
  assert.deepEqual(map.branches, []);
});

test("in_review без пройденных проверок: текущий шаг «Проверка данных»", () => {
  const map = buildRoadmap(app({ checksPassed: 0 }));
  assert.deepEqual(
    map.steps.map((step) => step.state),
    ["done", "current", "upcoming", "upcoming", "upcoming", "upcoming"],
  );
  const review = stepAt(map, 1);
  assert.equal(review.title, "Проверка данных");
  assert.equal(review.actor, "system");
});

test("in_review после первой проверки: текущий шаг «Оценка»", () => {
  const map = buildRoadmap(app({ checksPassed: 2 }));
  assert.deepEqual(
    map.steps.map((step) => step.state),
    ["done", "done", "current", "upcoming", "upcoming", "upcoming"],
  );
  const scoring = stepAt(map, 2);
  assert.equal(scoring.title, "Оценка");
  assert.equal(scoring.actor, "bank");
});

test("needs_client: вопрос банка и причина на текущем шаге", () => {
  const map = buildRoadmap(
    app({
      status: "needs_client",
      requests: [
        {
          id: "r-1",
          question: "Пришлите выписку по счёту",
          why: "Нужна для оценки оборотов",
          answer: null,
        },
      ] as Application["requests"],
    }),
  );
  const scoring = stepAt(map, 2);
  assert.equal(scoring.state, "current");
  assert.equal(scoring.actor, "client");
  assert.equal(scoring.clientAction, "Пришлите выписку по счёту");
  assert.equal(scoring.blocker, "Нужна для оценки оборотов");
  assert.deepEqual(map.branches, []);
});

test("counter_offer: текущий шаг «Решение» с ветками", () => {
  const map = buildRoadmap(app({ status: "counter_offer" }));
  const decision = stepAt(map, 3);
  assert.equal(decision.state, "current");
  assert.equal(decision.actor, "client");
  assert.ok(decision.clientAction);
  assert.deepEqual(map.branches, [
    "уточнение",
    "встречное предложение",
    "отказ",
    "одобрение",
  ]);
});

test("approved на подписании: текущий шаг «Подписание» с действием клиента", () => {
  const map = buildRoadmap(
    app({
      status: "approved",
      deal: { stage: "signing" } as Application["deal"],
    }),
  );
  const signing = stepAt(map, 4);
  assert.equal(signing.state, "current");
  assert.equal(signing.actor, "client");
  assert.ok(signing.clientAction);
  assert.deepEqual(map.branches, []);
});

test("disbursed: все шаги пройдены, веток нет", () => {
  const map = buildRoadmap(app({ status: "disbursed" }));
  assert.deepEqual(
    map.steps.map((step) => step.state),
    ["done", "done", "done", "done", "done", "done"],
  );
  assert.deepEqual(map.branches, []);
});

test("rejected банком: причина и подсказка на шаге «Решение»", () => {
  const map = buildRoadmap(
    app({
      status: "rejected",
      decision: {
        outcome: "rejected",
        decidedAt: "2026-10-24T10:00:00Z",
        summary: "Доходы не подтверждены",
        advice: "Можно подать новую заявку после обновления отчётности",
        offer: null,
        factors: [],
      } as Application["decision"],
    }),
  );
  const decision = stepAt(map, 3);
  assert.equal(decision.state, "current");
  assert.equal(decision.explanation, "Доходы не подтверждены");
  assert.equal(
    decision.clientAction,
    "Можно подать новую заявку после обновления отчётности",
  );
  assert.deepEqual(map.branches, []);
});

test("rejected клиентом: отказ от предложения, а не банка", () => {
  const map = buildRoadmap(
    app({
      status: "rejected",
      decision: {
        outcome: "approved",
        decidedAt: "2026-10-24T10:00:00Z",
        summary: "Одобрено",
        advice: null,
        offer: null,
        factors: [],
      } as Application["decision"],
    }),
  );
  const decision = stepAt(map, 3);
  assert.equal(decision.state, "current");
  assert.equal(decision.actor, "client");
  assert.match(decision.explanation, /отказались/);
  assert.deepEqual(map.branches, []);
});

test("blocked: ручная проверка на шаге «Решение»", () => {
  const map = buildRoadmap(app({ status: "blocked" }));
  const decision = stepAt(map, 3);
  assert.equal(decision.state, "current");
  assert.match(decision.explanation, /заблокирована/);
  assert.deepEqual(map.branches, []);
});
