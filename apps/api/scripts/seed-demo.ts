import { readFileSync } from "node:fs";

import { Pool } from "pg";

import {
  CREDIT_PRODUCTS,
  DEFAULT_KEY_RATE,
  productRate,
} from "@repo/contracts/product-catalog";

import {
  demoAccounts,
  demoAutonomyPolicies,
  demoEmployees,
  demoSources,
} from "../src/common/demo-data/demo-data.ts";

// Сид запускается tsx-ом мимо Nest, поэтому .env сам не читается. Подтягиваем локальный .env вручную.
function loadEnvFromFile(): void {
  try {
    const text = readFileSync(new URL("../.env", import.meta.url), "utf8");
    for (const line of text.split("\n")) {
      const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
      if (match && process.env[match[1]] === undefined) {
        const value = match[2].replace(/^(["'])(.*)\1$/, "$2");
        process.env[match[1]] = value;
      }
    }
  } catch {
    // Нет .env — остаются переменные окружения или дефолты.
  }
}

loadEnvFromFile();

const databaseUrl =
  process.env.DATABASE_URL ?? "postgres://alfa:alfa@localhost:5432/alfa";
const pool = new Pool({ connectionString: databaseUrl });

async function seed(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(`
      create table if not exists demo_accounts (
        id text primary key,
        payload jsonb not null
      );
      create table if not exists demo_sessions (
        token text primary key,
        account_id text not null references demo_accounts(id),
        role text not null,
        created_at timestamptz not null default now()
      );
      create table if not exists demo_employees (
        id text primary key,
        payload jsonb not null
      );
      create table if not exists demo_sources (
        inn text primary key,
        payload jsonb not null
      );
      create table if not exists autonomy_policies (
        product_id text primary key,
        payload jsonb not null
      );
      create table if not exists applications (
        id text primary key, number text not null unique, inn text not null,
        product_id text not null, amount numeric not null, term_months integer not null,
        purpose text not null, status text not null, check_job_id text,
        scoring jsonb, decision jsonb, offer jsonb, created_at timestamptz not null, updated_at timestamptz not null
      );
      create table if not exists scoring_jobs (
        id text primary key, application_id text not null references applications(id),
        status text not null, idempotency_key text not null, created_at timestamptz not null,
        started_at timestamptz, finished_at timestamptz, error text, result jsonb,
        attempts integer not null default 0, next_attempt_at timestamptz,
        unique(application_id, idempotency_key)
      );
      create table if not exists application_events (
        id bigserial primary key, application_id text not null references applications(id),
        kind text not null, payload jsonb not null, created_at timestamptz not null default now(),
        event_key text unique
      );
      alter table application_events add column if not exists event_key text;
      alter table applications add column if not exists decision jsonb;
      alter table applications add column if not exists offer jsonb;
    `);
    for (const account of demoAccounts) {
      await client.query(
        `insert into demo_accounts(id,payload) values($1,$2)
         on conflict(id) do update set payload=excluded.payload`,
        [account.id, account],
      );
    }
    for (const employee of demoEmployees) {
      await client.query(
        `insert into demo_employees(id,payload) values($1,$2)
         on conflict(id) do update set payload=excluded.payload`,
        [employee.id, employee],
      );
    }
    for (const [inn, sources] of Object.entries(demoSources)) {
      await client.query(
        `insert into demo_sources(inn,payload) values($1,$2)
         on conflict(inn) do update set payload=excluded.payload`,
        [inn, sources],
      );
    }
    for (const [productId, policy] of Object.entries(demoAutonomyPolicies)) {
      await client.query(
        `insert into autonomy_policies(product_id,payload) values($1,$2)
         on conflict(product_id) do update set payload=excluded.payload`,
        [productId, policy],
      );
    }
    await seedApplications(client);
    await client.query("commit");
    console.log(
      `Seeded ${demoAccounts.length} accounts, ${demoEmployees.length} employees`,
    );
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

/** Скоринг одобренной демо-заявки: рекомендация approve, факторы и причина. */
function approvedScoring() {
  return {
    model: "rules-baseline-v2",
    score: 75,
    recommendation: "approve",
    details: {
      score: 75,
      grade: "A",
      riskBand: "low",
      pd: 0.125,
      healthIndex: 67,
      readinessIndex: 60,
      confidence: 0.7,
      computedAt: "2026-10-05T12:00:00.000Z",
      model: "rules-baseline-v2",
      modelVersion: "2026-10-23",
      policyVersion: "policy-baseline-v2",
      featureSnapshotId: "fs-c9b9610409e32c8b0a2e921c",
      recommendation: "approve",
      reasons: ["Финансовое состояние устойчивое"],
      factors: [
        {
          id: "egrul_status",
          label: "Статус ЕГРЮЛ",
          value: "Действующее",
          impact: 15,
          source: "egrul",
          confidence: 1,
        },
        {
          id: "fns_tax_debt",
          label: "Налоговый долг",
          value: "Задолженности нет",
          impact: 10,
          source: "fns",
          confidence: 1,
        },
        {
          id: "bki_overdue",
          label: "Просрочки БКИ",
          value: "Нет просрочек",
          impact: 5,
          source: "bki",
          confidence: 1,
        },
      ],
      nextActions: [],
      explainability: [],
      missingSources: [],
    },
  };
}

/** Оффер одобренной демо-заявки: как в конвейере, по продукту и ключевой ставке. */
function approvedOffer() {
  const product = CREDIT_PRODUCTS.find((item) => item.id === "working_capital");
  return {
    productId: "working_capital" as const,
    amount: 2_000_000,
    termMonths: 12,
    ratePct: product ? productRate(product, DEFAULT_KEY_RATE.value) : 19,
  };
}

async function seedApplications(
  client: import("pg").PoolClient,
): Promise<void> {
  const applications = [
    {
      id: "seed-app-bakery",
      number: "SC-DEMO-001",
      inn: "9901000017",
      productId: "working_capital",
      amount: 2_000_000,
      termMonths: 12,
      purpose: "working_capital",
      status: "approved",
      offer: approvedOffer(),
      scoring: approvedScoring(),
    },
    {
      id: "seed-app-workshop",
      number: "SC-DEMO-002",
      inn: "990200000025",
      productId: "equipment",
      amount: 1_500_000,
      termMonths: 24,
      purpose: "equipment",
      status: "needs_client",
      offer: null,
      scoring: null,
    },
    {
      id: "seed-app-logistics",
      number: "SC-DEMO-003",
      inn: "9903000033",
      productId: "cash_gap",
      amount: 800_000,
      termMonths: 6,
      purpose: "cash_gap",
      status: "rejected",
      offer: null,
      scoring: null,
    },
  ];

  /**
   * Результаты скоринга seed-заявок. Значения получены вызовом scoring-сервиса
   * (POST /v1/score) с теми же входными данными, которые отправляет проверка
   * компании (источники demo_sources + сумма и срок заявки), и зафиксированы
   * здесь, чтобы демо показывало индексы без запуска конвейера.
   */
  const demoScoring: Record<
    string,
    { score: number; model: string; recommendation: string; details: unknown }
  > = {
    "seed-app-bakery": {
      score: 75,
      model: "rules-baseline-v2",
      recommendation: "request_info",
      details: {
        score: 75,
        model: "rules-baseline-v2",
        modelVersion: "2026-10-23",
        policyVersion: "policy-baseline-v2",
        featureSnapshotId: "fs-c9b9610409e32c8b0a2e921c",
        computedAt: "2026-10-05T12:00:00.000Z",
        grade: "A",
        riskBand: "low",
        pd: 0.125,
        healthIndex: 67,
        readinessIndex: 25,
        confidence: 0.35,
        recommendation: "request_info",
        reasons: ["Недостаточно подтверждённых данных"],
        nextActions: [
          "Предоставить: согласие на запрос БКИ, подтверждающие документы, годовая выручка",
        ],
        explainability: [
          "Факторы отсортированы по абсолютному влиянию на baseline score",
          "Рекомендация не заменяет решение сотрудника банка",
        ],
        missingSources: ["БКИ"],
        autonomyMode: "shadow",
        factors: [
          {
            id: "egrul_status",
            label: "Статус ЕГРЮЛ",
            value: "Действующее",
            impact: 15,
            confidence: 1,
            source: "egrul",
          },
          {
            id: "bki_overdue",
            label: "Просрочки БКИ",
            value: "Нет данных",
            impact: 0,
            confidence: 0,
            source: "bki",
          },
          {
            id: "fns_tax_debt",
            label: "Налоговый долг",
            value: "Задолженности нет",
            impact: 10,
            confidence: 1,
            source: "fns",
          },
          {
            id: "bki_active_loans",
            label: "Активные кредиты",
            value: "Нет данных",
            impact: 0,
            confidence: 0,
            source: "bki",
          },
        ],
      },
    },
    "seed-app-workshop": {
      score: 60,
      model: "rules-baseline-v2",
      recommendation: "request_info",
      details: {
        score: 60,
        model: "rules-baseline-v2",
        modelVersion: "2026-10-23",
        policyVersion: "policy-baseline-v2",
        featureSnapshotId: "fs-9367269e2264af2362863947",
        computedAt: "2026-10-14T09:00:00.000Z",
        grade: "B",
        riskBand: "moderate",
        pd: 0.17,
        healthIndex: 44,
        readinessIndex: 25,
        confidence: 0.35,
        recommendation: "request_info",
        reasons: ["Недостаточно подтверждённых данных"],
        nextActions: [
          "Предоставить: согласие на запрос БКИ, подтверждающие документы, годовая выручка",
        ],
        explainability: [
          "Факторы отсортированы по абсолютному влиянию на baseline score",
          "Рекомендация не заменяет решение сотрудника банка",
        ],
        missingSources: ["БКИ"],
        autonomyMode: "shadow",
        factors: [
          {
            id: "egrul_status",
            label: "Статус ЕГРЮЛ",
            value: "Действующее",
            impact: 15,
            confidence: 1,
            source: "egrul",
          },
          {
            id: "bki_overdue",
            label: "Просрочки БКИ",
            value: "Нет данных",
            impact: 0,
            confidence: 0,
            source: "bki",
          },
          {
            id: "fns_tax_debt",
            label: "Налоговый долг",
            value: "Долг 46,300 ₽",
            impact: -5,
            confidence: 1,
            source: "fns",
          },
          {
            id: "bki_active_loans",
            label: "Активные кредиты",
            value: "Нет данных",
            impact: 0,
            confidence: 0,
            source: "bki",
          },
        ],
      },
    },
    "seed-app-logistics": {
      score: 75,
      model: "rules-baseline-v2",
      recommendation: "request_info",
      details: {
        score: 75,
        model: "rules-baseline-v2",
        modelVersion: "2026-10-23",
        policyVersion: "policy-baseline-v2",
        featureSnapshotId: "fs-316b626ad608bf4581ecea59",
        computedAt: "2026-10-19T12:00:00.000Z",
        grade: "A",
        riskBand: "low",
        pd: 0.125,
        healthIndex: 67,
        readinessIndex: 25,
        confidence: 0.35,
        recommendation: "request_info",
        reasons: ["Недостаточно подтверждённых данных"],
        nextActions: [
          "Предоставить: согласие на запрос БКИ, подтверждающие документы, годовая выручка",
        ],
        explainability: [
          "Факторы отсортированы по абсолютному влиянию на baseline score",
          "Рекомендация не заменяет решение сотрудника банка",
        ],
        missingSources: ["БКИ"],
        autonomyMode: "shadow",
        factors: [
          {
            id: "egrul_status",
            label: "Статус ЕГРЮЛ",
            value: "Действующее",
            impact: 15,
            confidence: 1,
            source: "egrul",
          },
          {
            id: "bki_overdue",
            label: "Просрочки БКИ",
            value: "Нет данных",
            impact: 0,
            confidence: 0,
            source: "bki",
          },
          {
            id: "fns_tax_debt",
            label: "Налоговый долг",
            value: "Задолженности нет",
            impact: 10,
            confidence: 1,
            source: "fns",
          },
          {
            id: "bki_active_loans",
            label: "Активные кредиты",
            value: "Нет данных",
            impact: 0,
            confidence: 0,
            source: "bki",
          },
        ],
      },
    },
  };

  for (const application of applications) {
    const now = new Date("2026-10-24T00:00:00.000Z").toISOString();
    await client.query(
      `insert into applications(id,number,inn,product_id,amount,term_months,purpose,status,check_job_id,scoring,decision,offer,created_at,updated_at)
       values($1,$2,$3,$4,$5,$6,$7,$8,null,$9,null,$10,$11,$11)
       on conflict(id) do update set status=excluded.status, product_id=excluded.product_id, amount=excluded.amount,
       term_months=excluded.term_months, purpose=excluded.purpose, check_job_id=excluded.check_job_id,
       scoring=excluded.scoring, decision=null, offer=excluded.offer`,
      [
        application.id,
        application.number,
        application.inn,
        application.productId,
        application.amount,
        application.termMonths,
        application.purpose,
        application.status,
        application.scoring ? JSON.stringify(application.scoring) : null,
        application.offer ? JSON.stringify(application.offer) : null,
        now,
        demoScoring[application.id],
      ],
    );
  }
  await client.query(
    `update scoring_jobs
        set status='succeeded', finished_at=coalesce(finished_at, now()),
            next_attempt_at=null
      where application_id = any($1::text[]) and status in ('queued', 'running')`,
    [applications.map((application) => application.id)],
  );
  await client.query(
    `delete from application_events as duplicate
      using application_events as original
      where duplicate.event_key is not null
        and duplicate.event_key = original.event_key
        and (duplicate.created_at, duplicate.id) > (original.created_at, original.id)`,
  );
  await client.query(
    `delete from application_events as duplicate
      using application_events as original
      where duplicate.payload->>'seedKey' is not null
        and duplicate.payload->>'seedKey' = original.payload->>'seedKey'
        and (duplicate.created_at, duplicate.id) > (original.created_at, original.id)`,
  );
  await client.query(
    `update application_events
        set event_key = payload->>'seedKey'
      where event_key is null and payload->>'seedKey' is not null`,
  );
  await client.query(`drop index if exists application_events_event_key_idx`);
  await client.query(
    `create unique index application_events_event_key_idx
       on application_events(event_key)`,
  );
  await client.query(
    `create unique index if not exists application_events_event_key_all_idx
       on application_events(event_key)`,
  );
  for (const application of applications) {
    const jobId = `seed-job-${application.id}`;
    await client.query(
      `insert into scoring_jobs(
         id, application_id, status, idempotency_key, created_at,
         started_at, finished_at, attempts, next_attempt_at, result
       ) values($1, $2, 'succeeded', $3, $4, $4, $4, 1, null, $5)
       on conflict(application_id, idempotency_key) do update set
         id = excluded.id, status = 'succeeded', finished_at = excluded.finished_at,
         next_attempt_at = null, result = excluded.result`,
      [
        jobId,
        application.id,
        `seed-check-v1-${application.id}`,
        "2026-10-04T09:00:00.000Z",
        demoScoring[application.id],
      ],
    );
    await client.query(`update applications set check_job_id=$2 where id=$1`, [
      application.id,
      jobId,
    ]);
  }
  await seedReportEvents(client);
}

async function seedReportEvents(
  client: import("pg").PoolClient,
): Promise<void> {
  const events = [
    {
      key: "bakery-created",
      applicationId: "seed-app-bakery",
      kind: "application_created",
      at: "2026-10-04T10:00:00.000Z",
      payload: {
        title: "Заявка создана",
        reportContext: {
          version: 1,
          productId: "working_capital",
          status: "in_review",
          stage: "intake",
          actorKind: "system",
          actorName: "Кредитный конвейер",
          slaState: "on_track",
        },
      },
    },
    {
      key: "bakery-scored",
      applicationId: "seed-app-bakery",
      kind: "scoring_succeeded",
      at: "2026-10-05T12:00:00.000Z",
      payload: {
        title: "Скоринг завершён",
        recommendation: "approve",
        autonomyMode: "controlled",
        autonomyDisposition: "auto_offer_sent",
        reportContext: {
          version: 1,
          productId: "working_capital",
          status: "approved",
          stage: "decision",
          actorKind: "system",
          actorName: "Кредитный конвейер",
          recommendation: "approve",
          autonomyMode: "controlled",
          autonomyDisposition: "auto_offer_sent",
          slaState: "on_track",
        },
      },
    },
    {
      key: "bakery-approved",
      applicationId: "seed-app-bakery",
      kind: "status_changed",
      at: "2026-10-06T09:30:00.000Z",
      payload: {
        actionType: "approve",
        title: "Заявка одобрена",
        actorKind: "employee",
        actorId: "an-1",
        actorName: "Аналитик Демо 1",
        reportContext: {
          version: 1,
          productId: "working_capital",
          status: "approved",
          stage: "decision",
          actorKind: "employee",
          actorId: "an-1",
          actorName: "Аналитик Демо 1",
          recommendation: "approve",
          autonomyMode: "controlled",
          autonomyDisposition: "confirmed",
          slaState: "on_track",
        },
      },
    },
    {
      key: "workshop-created",
      applicationId: "seed-app-workshop",
      kind: "application_created",
      at: "2026-10-12T08:00:00.000Z",
      payload: {
        title: "Заявка создана",
        reportContext: {
          version: 1,
          productId: "equipment",
          status: "in_review",
          stage: "intake",
          actorKind: "system",
          actorName: "Кредитный конвейер",
          slaState: "at_risk",
        },
      },
    },
    {
      key: "workshop-counter",
      applicationId: "seed-app-workshop",
      kind: "status_changed",
      at: "2026-10-15T16:00:00.000Z",
      payload: {
        actionType: "counter_offer",
        title: "Встречное предложение",
        actorKind: "employee",
        actorId: "lead-1",
        actorName: "Руководитель Демо",
        reportContext: {
          version: 1,
          productId: "equipment",
          status: "counter_offer",
          stage: "decision",
          actorKind: "employee",
          actorId: "lead-1",
          actorName: "Руководитель Демо",
          recommendation: "approve",
          autonomyMode: "assist",
          autonomyDisposition: "manual_required",
          slaState: "overdue",
        },
      },
    },
    {
      key: "logistics-created",
      applicationId: "seed-app-logistics",
      kind: "application_created",
      at: "2026-10-18T11:00:00.000Z",
      payload: {
        title: "Заявка создана",
        reportContext: {
          version: 1,
          productId: "cash_gap",
          status: "in_review",
          stage: "intake",
          actorKind: "system",
          actorName: "Кредитный конвейер",
          slaState: "overdue",
        },
      },
    },
    {
      key: "logistics-reject",
      applicationId: "seed-app-logistics",
      kind: "status_changed",
      at: "2026-10-20T14:00:00.000Z",
      payload: {
        actionType: "reject",
        title: "Отказ по заявке",
        actorKind: "employee",
        actorId: "an-1",
        actorName: "Аналитик Демо 1",
        reportContext: {
          version: 1,
          productId: "cash_gap",
          status: "rejected",
          stage: "decision",
          actorKind: "employee",
          actorId: "an-1",
          actorName: "Аналитик Демо 1",
          recommendation: "approve",
          autonomyMode: "assist",
          autonomyDisposition: "manual_required",
          slaState: "overdue",
        },
      },
    },
  ];
  for (const event of events) {
    await client.query(
      `insert into application_events(event_key, application_id, kind, payload, created_at)
       values ($1, $2, $3, $4, $5)
       on conflict (event_key) do update set
         application_id=excluded.application_id,
         kind=excluded.kind,
         payload=excluded.payload,
         created_at=excluded.created_at`,
      [event.key, event.applicationId, event.kind, event.payload, event.at],
    );
  }
}

void seed().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
