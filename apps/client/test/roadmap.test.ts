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
    cancelledBy: null,
    ...patch,
  } as Application;
}

function offer() {
  return {
    amount: 1_000_000,
    termMonths: 24,
    ratePercent: 18,
    monthlyPayment: 50_000,
  };
}

function bankDecision(
  overrides: Partial<NonNullable<Application["decision"]>> = {},
): NonNullable<Application["decision"]> {
  return {
    outcome: "rejected",
    decidedAt: "2026-10-24T10:00:00Z",
    summary: "Доходы не подтверждены",
    advice: "Можно подать новую заявку после обновления отчётности",
    offer: null,
    factors: [],
    ...overrides,
  } as NonNullable<Application["decision"]>;
}

function stepAt(map: Roadmap, index: number): RoadmapStep {
  const step = map.steps[index];
  assert.ok(step);
  return step;
}

const reviewBranches = [
  "уточнение",
  "встречное предложение",
  "отказ",
  "одобрение",
];

const offerBranches = [
  "принять",
  "отказаться",
  "банк может вернуть на проверку",
];

test("карта из шести шагов в порядке этапов", () => {
  const map = buildRoadmap(app({}));
  assert.deepEqual(
    map.steps.map((step) => step.title),
    ["Заявка", "Проверка данных", "Оценка", "Решение", "Подписание", "Выдача"],
  );
  assert.deepEqual(map.branches, reviewBranches);
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
  assert.deepEqual(map.branches, reviewBranches);
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
  assert.deepEqual(map.branches, reviewBranches);
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

test("counter_offer: текущий шаг «Решение», ветки исхода оффера", () => {
  const map = buildRoadmap(app({ status: "counter_offer" }));
  const decision = stepAt(map, 3);
  assert.equal(decision.state, "current");
  assert.equal(decision.actor, "client");
  assert.ok(decision.clientAction);
  assert.deepEqual(map.branches, offerBranches);
});

test("approved без сделки: текущий шаг «Решение», ветки исхода оффера", () => {
  const map = buildRoadmap(app({ status: "approved" }));
  const decision = stepAt(map, 3);
  assert.equal(decision.state, "current");
  assert.equal(decision.actor, "client");
  assert.ok(decision.clientAction);
  assert.deepEqual(map.branches, offerBranches);
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

test("rejected банком: причина и подсказка на шаге «Решение», будущие шаги скрыты", () => {
  const map = buildRoadmap(
    app({ status: "rejected", decision: bankDecision() }),
  );
  assert.deepEqual(
    map.steps.map((step) => step.state),
    ["done", "done", "done", "current"],
  );
  const decision = stepAt(map, 3);
  assert.equal(decision.title, "Решение");
  assert.equal(decision.explanation, "Доходы не подтверждены");
  assert.equal(
    decision.clientAction,
    "Можно подать новую заявку после обновления отчётности",
  );
  assert.deepEqual(map.branches, []);
});

test("rejected клиентом: отказ от оффера, будущие шаги скрыты", () => {
  const map = buildRoadmap(
    app({
      status: "rejected",
      cancelledBy: "client",
      decision: bankDecision({
        outcome: "approved",
        summary: "Заявка одобрена",
        offer: offer(),
      }),
    }),
  );
  const decision = stepAt(map, 3);
  assert.equal(decision.state, "current");
  assert.equal(decision.actor, "client");
  assert.match(decision.explanation, /отказались/);
  assert.deepEqual(map.branches, []);
});

test("rejected клиентом до предложения: заявка отозвана, остался только черновик", () => {
  const map = buildRoadmap(
    app({ status: "rejected", cancelledBy: "client", decision: null }),
  );
  assert.deepEqual(
    map.steps.map((step) => step.state),
    ["current"],
  );
  const draft = stepAt(map, 0);
  assert.equal(draft.title, "Заявка");
  assert.equal(draft.actor, "client");
  assert.match(draft.explanation, /отозвана/);
  assert.deepEqual(map.branches, []);
});

test("rejected сотрудником банка: отдельный текст, будущие шаги скрыты", () => {
  const map = buildRoadmap(
    app({ status: "rejected", cancelledBy: "employee", decision: null }),
  );
  assert.deepEqual(
    map.steps.map((step) => step.state),
    ["done", "done", "current"],
  );
  const decision = stepAt(map, 2);
  assert.equal(decision.actor, "bank");
  assert.match(decision.explanation, /отменил/);
  assert.deepEqual(map.branches, []);
});

test("blocked на проверке: текущий шаг по этапу до блокировки", () => {
  const map = buildRoadmap(app({ status: "blocked", checksPassed: 0 }));
  assert.deepEqual(
    map.steps.map((step) => step.state),
    ["done", "current", "upcoming", "upcoming", "upcoming", "upcoming"],
  );
  const review = stepAt(map, 1);
  assert.equal(review.title, "Проверка данных");
  assert.match(review.explanation, /заблокирована/);
  assert.deepEqual(map.branches, []);
});

test("blocked с оффером: текущий шаг «Решение»", () => {
  const map = buildRoadmap(
    app({
      status: "blocked",
      decision: bankDecision({ outcome: "approved", offer: offer() }),
    }),
  );
  const decision = stepAt(map, 3);
  assert.equal(decision.state, "current");
  assert.match(decision.explanation, /заблокирована/);
  assert.deepEqual(map.branches, []);
});

test("blocked при подписании: текущий шаг «Подписание»", () => {
  const map = buildRoadmap(
    app({
      status: "blocked",
      deal: { stage: "signing" } as Application["deal"],
    }),
  );
  const signing = stepAt(map, 4);
  assert.equal(signing.state, "current");
  assert.equal(signing.title, "Подписание");
  assert.match(signing.explanation, /заблокирована/);
  assert.deepEqual(map.branches, []);
});
