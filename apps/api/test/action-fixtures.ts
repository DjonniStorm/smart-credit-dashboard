import { randomUUID } from "node:crypto";

import type { DataSource } from "typeorm";

import { CREDIT_PRODUCTS } from "@repo/contracts/product-catalog";
import type { ApplicationWorkflow } from "@repo/contracts/workflow";

export const catalog = {
  keyRate: 16,
  keyRateDate: "2026-10-01",
  products: CREDIT_PRODUCTS.map((product) => ({ ...product })),
};

export async function seedApplication(
  db: DataSource,
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
  await db.query(
    `insert into applications(id,number,inn,product_id,amount,term_months,purpose,status,scoring,decision,created_at,updated_at)
     values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11)`,
    [
      application.id,
      application.number,
      application.inn,
      application.productId,
      application.amount,
      application.termMonths,
      application.purpose,
      application.status,
      application.scoring,
      application.decision,
      now,
    ],
  );
  return application;
}
