import { randomUUID } from "node:crypto";

import type { DataSource } from "typeorm";

import { CREDIT_PRODUCTS } from "@repo/contracts/product-catalog";
import type { ApplicationWorkflow } from "@repo/contracts/workflow";

import type { WorkflowStore } from "../src/modules/applications/workflow-store.ts";

export const catalog = {
  keyRate: 16,
  keyRateDate: "2026-10-01",
  products: CREDIT_PRODUCTS.map((product) => ({ ...product })),
};

export async function seedApplication(
  db: DataSource,
  store: WorkflowStore,
  patch: Partial<ApplicationWorkflow> = {},
): Promise<ApplicationWorkflow> {
  const now = new Date().toISOString();
  const application: ApplicationWorkflow = {
    id: `app-test-${randomUUID()}`,
    number: `T-${randomUUID()}`,
    inn: "7701234567",
    productId: "working_capital",
    amount: 1_500_000,
    termMonths: 12,
    purpose: "working_capital",
    status: "in_review",
    offer: null,
    requestedInfo: [],
    rejectReason: null,
    hold: null,
    urgent: false,
    urgentReason: null,
    assigneeId: null,
    handoff: null,
    checkJobId: null,
    scoring: { score: 80, model: "baseline", recommendation: "approve" },
    decision: null,
    createdAt: now,
    updatedAt: now,
    ...patch,
  };
  await store.saveApplication(application);
  if (patch.status && patch.status !== "in_review") {
    await db.query("update applications set status=$2 where id=$1", [
      application.id,
      patch.status,
    ]);
  }
  return application;
}
