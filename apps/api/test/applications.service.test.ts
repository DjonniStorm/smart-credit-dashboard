import assert from "node:assert/strict";
import test from "node:test";

import type { ApplicationWorkflow, ScoringJob } from "@repo/contracts/workflow";

import { ApplicationsService } from "../src/modules/applications/applications.service.ts";

const checkResult = {
  inn: "7701234567",
  sources: {
    egrul: {
      inn: "7701234567",
      ogrn: "1",
      name: "ООО Тест",
      status: "Действующее",
      registeredAt: "2020-01-01",
      okved: "47.11",
    },
    bki: { inn: "7701234567", activeLoans: 1, totalDebtRub: 100, overdueDays: 0 },
    fns: {
      inn: "7701234567",
      taxDebtRub: 0,
      employees: 2,
      massRegistrationAddress: false,
    },
  },
  scoring: {
    inn: "7701234567",
    score: 82,
    model: "baseline-v1",
    readiness_index: 100,
    confidence: 0.9,
    recommendation: "approve" as const,
  },
};

class MemoryStore {
  private readonly applications = new Map<string, ApplicationWorkflow>();
  private readonly jobs = new Map<string, ScoringJob>();
  private readonly idempotency = new Map<string, string>();

  async findIdempotent(scope: string, key: string): Promise<string | null> {
    return this.idempotency.get(`${scope}:${key}`) ?? null;
  }

  async remember(scope: string, key: string, resourceId: string): Promise<void> {
    this.idempotency.set(`${scope}:${key}`, resourceId);
  }

  async saveApplication(application: ApplicationWorkflow): Promise<void> {
    this.applications.set(application.id, application);
  }

  async getApplication(id: string): Promise<ApplicationWorkflow | null> {
    return this.applications.get(id) ?? null;
  }

  async saveJob(job: ScoringJob): Promise<void> {
    this.jobs.set(job.id, job);
  }

  async getJob(id: string): Promise<ScoringJob | null> {
    return this.jobs.get(id) ?? null;
  }

  async setJobRetry(): Promise<void> {}

  async event(): Promise<void> {}
}

function service(): { applications: ApplicationsService; store: MemoryStore } {
  const store = new MemoryStore();
  const companies = { check: async () => checkResult };
  return {
    applications: new ApplicationsService(companies as never, store as never),
    store,
  };
}

test("create is idempotent and persists scoring result", async () => {
  const { applications, store } = service();
  const input = {
    inn: "7701234567",
    productId: "working_capital",
    amount: 500_000,
    termMonths: 12,
    purpose: "Оборотные средства",
    idempotencyKey: "create-key-1",
  } as const;

  const first = await applications.create(input);
  const second = await applications.create(input);

  assert.equal(second.application.id, first.application.id);
  assert.equal(second.checkJob.id, first.checkJob.id);

  await applications.processJob(await applications.getJob(first.checkJob.id));
  const application = await store.getApplication(first.application.id);
  assert.equal(application?.scoring?.score, 82);
});

test("repeated check key returns the same job", async () => {
  const { applications } = service();
  const created = await applications.create({
    inn: "7701234567",
    productId: "working_capital",
    amount: 100_000,
    termMonths: 6,
    purpose: "Пополнение оборота",
    idempotencyKey: "create-key-2",
  });

  const first = await applications.startCheck(created.application.id, {
    idempotencyKey: "check-key-1",
  });
  const second = await applications.startCheck(created.application.id, {
    idempotencyKey: "check-key-1",
  });

  assert.equal(first.id, second.id);
});
