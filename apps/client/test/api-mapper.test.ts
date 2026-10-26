import assert from "node:assert/strict";
import test from "node:test";

import type { ApiApplication, DemoSession } from "@repo/contracts/api";

import { toCabinetApplication } from "../src/shared/api/cabinet/api-mapper";

function apiApp(patch: Partial<ApiApplication>): ApiApplication {
  return {
    id: "app-1",
    number: "SC-1",
    inn: "770000000000",
    productId: "working_capital",
    amount: 1_000_000,
    termMonths: 24,
    purpose: "working_capital",
    status: "DRAFT",
    offerKind: null,
    checkJobId: null,
    scoring: null,
    autonomyCase: null,
    offer: null,
    requestedInfo: [],
    rejectReason: null,
    clientReply: null,
    deal: null,
    cancelledBy: null,
    cancelledFrom: null,
    clientComments: [],
    createdAt: "2026-10-24T10:00:00Z",
    updatedAt: "2026-10-24T10:00:00Z",
    ...patch,
  } as ApiApplication;
}

const session = {
  account: {
    person: "Тест",
    role: "client",
    scenario: "тест",
    company: {
      inn: "770000000000",
      ogrn: "1027700000000",
      form: "ooo",
      name: "ООО Тест",
      registeredAt: "2010-01-01",
      okved: "47.11",
      okvedName: "Торговля",
      address: "Москва",
      head: "Иванов Иван",
    },
    knownFinancials: {
      revenueLastYear: 10_000_000,
      avgMonthlyTurnover: 1_000_000,
      monthlyDebtPayments: 100_000,
      employees: 10,
    },
  },
  role: "client",
} as DemoSession;

function scoring(
  overrides: Partial<NonNullable<ApiApplication["scoring"]>> = {},
): NonNullable<ApiApplication["scoring"]> {
  return {
    score: 70,
    model: "baseline",
    modelVersion: "v1",
    grade: "B",
    riskBand: "moderate",
    pd: 0.05,
    healthIndex: 60,
    readinessIndex: 60,
    confidence: 0.7,
    recommendation: "approve",
    factors: [],
    reasons: [],
    nextActions: [],
    ...overrides,
  };
}

const offer = {
  productId: "working_capital" as const,
  amount: 1_000_000,
  termMonths: 24,
  ratePct: 18,
};

test("CANCELLED клиентом с оффером: отказ от предложения, а не отказ банка", () => {
  const mapped = toCabinetApplication(
    apiApp({
      status: "CANCELLED",
      cancelledBy: "client",
      cancelledFrom: "approved",
      scoring: scoring(),
      offer,
    }),
    session,
  );
  assert.equal(mapped.status, "rejected");
  assert.equal(mapped.cancelledBy, "client");
  assert.equal(mapped.cancelledFrom, "approved");
  assert.ok(mapped.decision);
  assert.equal(mapped.decision.outcome, "approved");
  assert.ok(mapped.decision.offer);
});

test("CANCELLED клиентом до оффера: решения банка нет", () => {
  const mapped = toCabinetApplication(
    apiApp({
      status: "CANCELLED",
      cancelledBy: "client",
      cancelledFrom: "draft",
    }),
    session,
  );
  assert.equal(mapped.status, "rejected");
  assert.equal(mapped.cancelledBy, "client");
  assert.equal(mapped.decision, null);
});

test("CANCELLED сотрудником после подписания: решения банка нет, этап сохранён", () => {
  const mapped = toCabinetApplication(
    apiApp({
      status: "CANCELLED",
      cancelledBy: "employee",
      cancelledFrom: "signing",
      scoring: scoring(),
      offer,
    }),
    session,
  );
  assert.equal(mapped.cancelledBy, "employee");
  assert.equal(mapped.cancelledFrom, "signing");
  assert.equal(mapped.decision, null);
});

test("REJECTED банком: решение банка остаётся отказом", () => {
  const mapped = toCabinetApplication(
    apiApp({
      status: "REJECTED",
      scoring: scoring({
        recommendation: "reject",
        reasons: ["Доходы не подтверждены"],
      }),
    }),
    session,
  );
  assert.equal(mapped.status, "rejected");
  assert.equal(mapped.cancelledBy, null);
  assert.ok(mapped.decision);
  assert.equal(mapped.decision.outcome, "rejected");
  assert.match(mapped.decision.summary, /Доходы/);
});

test("события API попадают в историю заявки без id и в исходном порядке", () => {
  const mapped = toCabinetApplication(
    apiApp({
      status: "OFFERED",
      events: [
        {
          id: "e2",
          at: "2026-10-05T12:00:00Z",
          text: "Заявка одобрена",
          actor: "bank",
        },
        {
          id: "e1",
          at: "2026-10-04T10:00:00Z",
          text: "Заявка создана",
          actor: "system",
        },
      ],
    }),
    session,
  );
  assert.deepEqual(mapped.events, [
    { at: "2026-10-05T12:00:00Z", text: "Заявка одобрена", actor: "bank" },
    { at: "2026-10-04T10:00:00Z", text: "Заявка создана", actor: "system" },
  ]);
});
