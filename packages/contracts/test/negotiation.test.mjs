import assert from "node:assert/strict";
import test from "node:test";

import {
  FAST_TRACK_AMOUNT,
  MAX_DEBT_LOAD,
  monthlyPayment,
  negotiationPriorities,
  suggestNegotiationOptions,
} from "../src/negotiation.ts";

const products = [
  {
    id: "working-capital",
    name: "Оборотный",
    purposes: ["working_capital"],
    description: "",
    minAmount: 300_000,
    maxAmount: 10_000_000,
    minTermMonths: 3,
    maxTermMonths: 24,
    spreadPp: 5,
    collateral: null,
  },
  {
    id: "cash-gap",
    name: "Кассовый разрыв",
    purposes: ["cash_gap", "working_capital"],
    description: "",
    minAmount: 100_000,
    maxAmount: 3_000_000,
    minTermMonths: 1,
    maxTermMonths: 12,
    spreadPp: 6,
    collateral: null,
  },
  {
    id: "equipment",
    name: "Оборудование",
    purposes: ["equipment", "working_capital"],
    description: "",
    minAmount: 500_000,
    maxAmount: 30_000_000,
    minTermMonths: 12,
    maxTermMonths: 60,
    spreadPp: 3.5,
    collateral: "Оборудование",
  },
];

const financials = {
  revenueLastYear: 30_000_000,
  avgMonthlyTurnover: 3_000_000,
  monthlyDebtPayments: 100_000,
  employees: 12,
};

function input(priority, overrides = {}) {
  return {
    priority,
    purpose: "working_capital",
    current: {
      productId: "working-capital",
      amount: 2_000_000,
      termMonths: 12,
    },
    products,
    keyRate: 14,
    financials,
    ...overrides,
  };
}

test("every priority yields at most three distinct options that differ from current", () => {
  for (const priority of negotiationPriorities) {
    const options = suggestNegotiationOptions(input(priority));
    assert.ok(options.length <= 3, priority);
    if (priority !== "speed") {
      assert.ok(options.length >= 1, priority);
    }
    const keys = options.map(
      (o) => `${o.productId}/${o.amount}/${o.termMonths}`,
    );
    assert.equal(new Set(keys).size, keys.length, priority);
    assert.ok(!keys.includes("working-capital/2000000/12"), priority);
  }
});

test("is deterministic", () => {
  const first = suggestNegotiationOptions(input("amount"));
  assert.deepEqual(suggestNegotiationOptions(input("amount")), first);
});

test("no option exceeds product bounds, the revenue cap or the debt-load cap", () => {
  for (const priority of negotiationPriorities) {
    for (const option of suggestNegotiationOptions(input(priority))) {
      const product = products.find((p) => p.id === option.productId);
      assert.ok(
        option.amount >= product.minAmount &&
          option.amount <= product.maxAmount,
      );
      assert.ok(
        option.termMonths >= product.minTermMonths &&
          option.termMonths <= product.maxTermMonths,
      );
      assert.ok(option.amount <= financials.revenueLastYear * 0.5);
      assert.ok(
        option.debtLoad <= MAX_DEBT_LOAD + 0.001,
        `${priority} load ${option.debtLoad}`,
      );
      assert.equal(
        option.monthlyPayment,
        monthlyPayment(option.amount, option.termMonths, option.ratePercent),
      );
    }
  }
});

test("amount: first option has the largest amount", () => {
  const options = suggestNegotiationOptions(input("amount"));
  const amounts = options.map((o) => o.amount);
  assert.deepEqual(
    amounts,
    [...amounts].sort((a, b) => b - a),
  );
  assert.ok(amounts[0] > 2_000_000);
});

test("amount is cut by debt load when turnover is small", () => {
  const options = suggestNegotiationOptions(
    input("amount", {
      financials: {
        ...financials,
        avgMonthlyTurnover: 400_000,
        monthlyDebtPayments: 40_000,
      },
    }),
  );
  for (const option of options) {
    assert.ok(option.amount < 2_000_000);
    assert.ok(option.debtLoad <= MAX_DEBT_LOAD + 0.001);
  }
});

test("term: longest option has the lowest payment, shortest the highest", () => {
  const options = suggestNegotiationOptions(input("term"));
  const longest = options.find((o) => o.tag === "term_longest");
  const shortest = options.find((o) => o.tag === "term_shortest");
  assert.equal(longest.termMonths, 24);
  assert.ok(longest.monthlyPayment < shortest.monthlyPayment);
});

test("speed: no collateral, no extra checks, amount within the fast track", () => {
  const options = suggestNegotiationOptions(
    input("speed", {
      current: {
        productId: "working-capital",
        amount: 8_000_000,
        termMonths: 12,
      },
    }),
  );
  assert.ok(options.length > 0);
  for (const option of options) {
    assert.equal(option.collateral, null);
    assert.deepEqual(option.extraChecks, []);
    assert.ok(option.amount <= FAST_TRACK_AMOUNT);
    assert.equal(option.decisionDays.min, 1);
  }
});

test("speed: nothing to offer when current terms are already the fastest", () => {
  assert.deepEqual(suggestNegotiationOptions(input("speed")), []);
});

test("amount: never offers less than the current amount", () => {
  const options = suggestNegotiationOptions(
    input("amount", {
      current: {
        productId: "working-capital",
        amount: 7_000_000,
        termMonths: 24,
      },
    }),
  );
  for (const option of options) {
    assert.ok(option.amount > 7_000_000);
  }
});

test("collateral: offers collateral-free options and one secured with a lower rate", () => {
  const options = suggestNegotiationOptions(input("collateral"));
  assert.ok(options.some((o) => o.collateral === null));
  const secured = options.find((o) => o.collateral !== null);
  assert.ok(secured);
  assert.ok(secured.ratePercent < 19);
  assert.ok(secured.extraChecks.includes("collateral_review"));
  assert.ok(secured.expectedRequests.includes("collateral_documents"));
  assert.ok(secured.decisionDays.min > 1);
});

test("product: suggests other products, never the current one", () => {
  const options = suggestNegotiationOptions(input("product"));
  assert.ok(options.every((o) => o.productId !== "working-capital"));
});

test("large amounts bring manager review and a turnover statement", () => {
  const [option] = suggestNegotiationOptions(
    input("amount", {
      current: { productId: "equipment", amount: 1_000_000, termMonths: 24 },
    }),
  );
  assert.ok(option.amount > 5_000_000);
  assert.ok(option.extraChecks.includes("manager_review"));
  assert.ok(option.expectedRequests.includes("turnover_statement"));
});

test("returns nothing for an unknown product or when nothing is feasible", () => {
  assert.deepEqual(
    suggestNegotiationOptions(
      input("amount", {
        current: { productId: "nope", amount: 1, termMonths: 1 },
      }),
    ),
    [],
  );
  assert.deepEqual(
    suggestNegotiationOptions(
      input("amount", { financials: { ...financials, avgMonthlyTurnover: 0 } }),
    ),
    [],
  );
});
