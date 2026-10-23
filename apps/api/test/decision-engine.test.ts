import assert from "node:assert/strict";
import test from "node:test";

import type { ScoreResponse } from "@repo/contracts";

import { decide } from "../src/modules/applications/decision-engine.ts";

const application = { amount: 1_000_000 } as never;
const scoring = {
  inn: "7701234567",
  score: 55,
  model: "rules-baseline-v2",
  risk_band: "moderate",
  readiness_index: 100,
  confidence: 1,
} satisfies ScoreResponse;

test("scoring reject is not downgraded to manual review", () => {
  const result = decide(application, {
    ...scoring,
    recommendation: "reject",
  } satisfies ScoreResponse);
  assert.equal(result.recommendation, "reject");
});

test("scoring reject wins over incomplete readiness", () => {
  const result = decide(application, {
    ...scoring,
    recommendation: "reject",
    readiness_index: 50,
  } satisfies ScoreResponse);
  assert.equal(result.recommendation, "reject");
});

test("incomplete readiness requests info", () => {
  const result = decide(application, {
    ...scoring,
    recommendation: "manual_review",
    readiness_index: 50,
  } satisfies ScoreResponse);
  assert.equal(result.recommendation, "request_info");
});

test("confident approval stays within the autonomy limit", () => {
  const result = decide(application, {
    ...scoring,
    recommendation: "approve",
  } satisfies ScoreResponse);
  assert.equal(result.recommendation, "approve");
});

test("approve is blocked while a stop-factor source is missing", () => {
  const result = decide(application, {
    ...scoring,
    recommendation: "approve",
    missing_sources: ["БКИ"],
  } satisfies ScoreResponse);
  assert.equal(result.recommendation, "manual_review");
  assert.ok(result.rules.some((rule) => rule.id === "source-gap"));
});
