import assert from "node:assert/strict";
import test from "node:test";

import type { ScoreResponse } from "@repo/contracts";
import type { ApiAutonomySnapshot } from "@repo/contracts/api";

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

const stableAutonomy: ApiAutonomySnapshot = {
  config: {
    id: "policy-working-capital",
    modelVersion: "score-v3",
    productId: "working_capital",
    policyVersion: "policy-2026.10",
    amountBand: { min: 100_000, max: 5_000_000 },
    level: "stable",
    controlWindowEndsAt: "2099-12-31T23:59:59.000Z",
    minClosedCases: 100,
    maxManualOverrideRate: 0.1,
    maxCalibrationError: 0.05,
    minConfidence: 0.8,
    minGrade: "B",
    controlWindowMinutes: 30,
    revision: 2,
  },
  metrics: {
    closedCases: 150,
    manualOverrideRate: 0.03,
    calibrationError: 0.02,
    driftDetected: false,
    manualHold: false,
    eligibleCases: 150,
    manualOverrides: 5,
    calibrationSamples: 150,
    calibrationStatus: "available",
    driftStatus: "clear",
    computedAt: "2026-10-23T00:00:00.000Z",
  },
  eligibility: { eligible: true, reasons: [], controlWindow: "open" },
  case: null,
};

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

test("stable policy allows controlled approval when all gates pass", () => {
  const result = decide(
    application,
    { ...scoring, recommendation: "approve", grade: "A" },
    stableAutonomy,
  );
  assert.equal(result.autonomyMode, "controlled");
});

test("verified policy keeps approval under assist control", () => {
  const result = decide(
    application,
    { ...scoring, recommendation: "approve", grade: "A" },
    {
      ...stableAutonomy,
      config: { ...stableAutonomy.config, level: "verified" },
    },
  );
  assert.equal(result.autonomyMode, "assist");
});
