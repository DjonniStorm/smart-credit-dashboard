import { Pool } from "pg";

import {
  demoAccounts,
  demoCatalog,
  demoEmployees,
  demoSources,
} from "../src/common/demo-data/demo-data.ts";

const databaseUrl = process.env.DATABASE_URL ?? "postgres://alfa:alfa@localhost:5432/alfa";
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
      create table if not exists demo_catalog (
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
      create table if not exists applications (
        id text primary key, number text not null unique, inn text not null,
        product_id text not null, amount numeric not null, term_months integer not null,
        purpose text not null, status text not null, check_job_id text,
        scoring jsonb, created_at timestamptz not null, updated_at timestamptz not null
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
    `);
    for (const account of demoAccounts) {
      await client.query(
        `insert into demo_accounts(id,payload) values($1,$2)
         on conflict(id) do update set payload=excluded.payload`,
        [account.id, account],
      );
    }
    await client.query(
      `insert into demo_catalog(id,payload) values('default',$1)
       on conflict(id) do update set payload=excluded.payload`,
      [demoCatalog],
    );
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
    await seedApplications(client);
    await client.query("commit");
    console.log(`Seeded ${demoAccounts.length} accounts, ${demoEmployees.length} employees and ${demoCatalog.products.length} products`);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

async function seedApplications(client: import("pg").PoolClient): Promise<void> {
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
    },
  ];
  for (const application of applications) {
    const now = new Date().toISOString();
    await client.query(
      `insert into applications(id,number,inn,product_id,amount,term_months,purpose,status,check_job_id,scoring,created_at,updated_at)
       values($1,$2,$3,$4,$5,$6,$7,'in_review',$8,null,$9,$9)
       on conflict(id) do update set product_id=excluded.product_id, amount=excluded.amount,
       term_months=excluded.term_months, purpose=excluded.purpose, check_job_id=excluded.check_job_id`,
      [
        application.id,
        application.number,
        application.inn,
        application.productId,
        application.amount,
        application.termMonths,
        application.purpose,
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
}

void seed().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
