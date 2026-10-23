import assert from "node:assert/strict";
import test from "node:test";

import { decide } from "../src/modules/applications/decision-engine.ts";

const application = { amount: 1_000_000 } as never;
const scoring = {
  inn: "7701234567",
  score: 55,
  model: "rules-baseline-v2",
  risk_band: "moderate",
  readiness_index: 100,
  confidence: 1,
} as never;

test("scoring reject is not downgraded to manual review", () => {
  const result = decide(application, {
    ...(scoring as object),
    recommendation: "reject",
  } as never);
  assert.equal(result.recommendation, "reject");
});

test("scoring reject wins over incomplete readiness", () => {
  const result = decide(application, {
    ...(scoring as object),
    recommendation: "reject",
    readiness_index: 50,
  } as never);
  assert.equal(result.recommendation, "reject");
});

test("incomplete readiness requests info", () => {
  const result = decide(application, {
    ...(scoring as object),
    recommendation: "manual_review",
    readiness_index: 50,
  } as never);
  assert.equal(result.recommendation, "request_info");
});

test("confident approval stays within the autonomy limit", () => {
  const result = decide(application, {
    ...(scoring as object),
    recommendation: "approve",
  } as never);
  assert.equal(result.recommendation, "approve");
});
