import { Pool } from "pg";

import {
  demoAccounts,
  demoAutonomyPolicies,
  demoEmployees,
  demoSources,
} from "../src/common/demo-data/demo-data.ts";

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
        scoring jsonb, decision jsonb, created_at timestamptz not null, updated_at timestamptz not null
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
        kind text not null, payload jsonb not null, created_at timestamptz not null default now()
      );
      alter table applications add column if not exists decision jsonb;
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
      jobId: "seed-job-bakery",
      status: "approved",
    },
    {
      id: "seed-app-workshop",
      number: "SC-DEMO-002",
      inn: "990200000025",
      productId: "equipment",
      amount: 1_500_000,
      termMonths: 24,
      purpose: "equipment",
      jobId: "seed-job-workshop",
      status: "needs_client",
    },
    {
      id: "seed-app-logistics",
      number: "SC-DEMO-003",
      inn: "9903000033",
      productId: "cash_gap",
      amount: 800_000,
      termMonths: 6,
      purpose: "cash_gap",
      jobId: "seed-job-logistics",
      status: "rejected",
    },
  ];
  for (const application of applications) {
    const now = new Date("2026-10-24T00:00:00.000Z").toISOString();
    await client.query(
      `insert into applications(id,number,inn,product_id,amount,term_months,purpose,status,check_job_id,scoring,decision,created_at,updated_at)
       values($1,$2,$3,$4,$5,$6,$7,$8,$9,null,null,$10,$10)
       on conflict(id) do update set status=excluded.status, product_id=excluded.product_id, amount=excluded.amount,
       term_months=excluded.term_months, purpose=excluded.purpose, check_job_id=excluded.check_job_id,
       scoring=null, decision=null`,
      [
        application.id,
        application.number,
        application.inn,
        application.productId,
        application.amount,
        application.termMonths,
        application.purpose,
        application.status,
        application.jobId,
        now,
      ],
    );
    await client.query(
      `insert into scoring_jobs(id,application_id,status,idempotency_key,created_at,attempts)
       values($1,$2,'queued',$3,$4,0)
       on conflict(id) do update set status='queued', error=null, finished_at=null`,
      [application.jobId, application.id, `seed-${application.id}`, now],
    );
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
        actorId: "employee-analyst",
        actorName: "Анна Аналитик",
        reportContext: {
          version: 1,
          productId: "working_capital",
          status: "approved",
          stage: "decision",
          actorKind: "employee",
          actorId: "employee-analyst",
          actorName: "Анна Аналитик",
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
        actorId: "employee-lead",
        actorName: "Олег Руководитель",
        reportContext: {
          version: 1,
          productId: "equipment",
          status: "counter_offer",
          stage: "decision",
          actorKind: "employee",
          actorId: "employee-lead",
          actorName: "Олег Руководитель",
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
        actorId: "employee-analyst",
        actorName: "Анна Аналитик",
        reportContext: {
          version: 1,
          productId: "cash_gap",
          status: "rejected",
          stage: "decision",
          actorKind: "employee",
          actorId: "employee-analyst",
          actorName: "Анна Аналитик",
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
      `insert into application_events(application_id, kind, payload, created_at)
       select $1, $2, $3, $4
        where not exists (
          select 1 from application_events where payload->>'seedKey'=$5
        )`,
      [
        event.applicationId,
        event.kind,
        { ...event.payload, seedKey: event.key },
        event.at,
        event.key,
      ],
    );
  }
}

void seed().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
