import type { Application } from "@repo/contracts/cabinet";

import { tx } from "@/shared/i18n";

import { isDeclinedByClient, stageOf, stages } from "./stage";

export type RoadmapActor = "client" | "bank" | "system";
export type RoadmapStepState = "done" | "current" | "upcoming";

export interface RoadmapStep {
  key: string;
  title: string;
  state: RoadmapStepState;
  actor: RoadmapActor;
  explanation: string;
  blocker: string | null;
  clientAction: string | null;
}

export interface Roadmap {
  steps: RoadmapStep[];
  branches: string[];
}

const stepKeys = [
  "draft",
  "review",
  "scoring",
  "decision",
  "signing",
  "payout",
] as const;

const defaultActors: readonly RoadmapActor[] = [
  "client",
  "system",
  "bank",
  "bank",
  "client",
  "bank",
];

const decisionBranches = [
  tx.roadmap.branches.clarification,
  tx.roadmap.branches.counterOffer,
  tx.roadmap.branches.reject,
  tx.roadmap.branches.approve,
];

function stepState(index: number, current: number): RoadmapStepState {
  if (index < current) return "done";
  if (index === current) return "current";
  return "upcoming";
}

/** Строит карту заявки из статуса, запросов и текущего этапа. */
export function buildRoadmap(app: Application): Roadmap {
  const { current } = stageOf(app);

  const steps: RoadmapStep[] = stepKeys.map((key, index) => ({
    key,
    title: stages[index]!,
    state: stepState(index, current),
    actor: defaultActors[index]!,
    explanation: tx.roadmap.stepExplanation[index]!,
    blocker: null,
    clientAction: null,
  }));

  const currentStep = steps[Math.min(current, steps.length - 1)];
  let branches: string[] = [];
  if (!currentStep) return { steps, branches };

  switch (app.status) {
    case "draft":
      currentStep.explanation = tx.roadmap.current.draft;
      currentStep.clientAction = tx.roadmap.current.draftAction;
      break;
    case "in_review":
      currentStep.actor = app.checksPassed < 1 ? "system" : "bank";
      currentStep.explanation =
        app.checksPassed < 1
          ? tx.roadmap.current.review
          : tx.roadmap.current.scoring;
      break;
    case "needs_client": {
      const request = app.requests.find((item) => item.answer === null);
      currentStep.actor = "client";
      currentStep.explanation = tx.roadmap.current.needsClient;
      currentStep.clientAction = request?.question ?? null;
      currentStep.blocker = request?.why ?? null;
      break;
    }
    case "counter_offer":
      currentStep.actor = "client";
      currentStep.explanation = tx.roadmap.current.counterOffer;
      currentStep.clientAction = tx.roadmap.current.counterOfferAction;
      branches = decisionBranches;
      break;
    case "approved":
      if (!app.deal) {
        currentStep.actor = "client";
        currentStep.explanation = tx.roadmap.current.approvedOffer;
        currentStep.clientAction = tx.roadmap.current.approvedOfferAction;
        branches = decisionBranches;
      } else if (app.deal.stage === "offer") {
        currentStep.actor = "bank";
        currentStep.explanation = tx.roadmap.current.preparing;
      } else if (app.deal.stage === "signing") {
        currentStep.actor = "client";
        currentStep.explanation = tx.roadmap.current.signing;
        currentStep.clientAction = tx.roadmap.current.signingAction;
      } else if (app.deal.stage === "disbursing") {
        currentStep.actor = "bank";
        currentStep.explanation = tx.roadmap.current.disbursing;
      } else {
        currentStep.actor = "bank";
        currentStep.explanation = tx.roadmap.current.done;
      }
      break;
    case "rejected":
      if (isDeclinedByClient(app)) {
        currentStep.actor = "client";
        currentStep.explanation = tx.roadmap.current.declined;
      } else {
        currentStep.actor = "bank";
        currentStep.explanation =
          app.decision?.summary ?? tx.roadmap.current.rejected;
        currentStep.clientAction = app.decision?.advice ?? null;
      }
      break;
    case "blocked":
      currentStep.actor = "bank";
      currentStep.explanation = tx.roadmap.current.blocked;
      break;
    case "disbursed":
      break;
  }

  return { steps, branches };
}
