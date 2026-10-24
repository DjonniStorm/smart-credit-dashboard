import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import http from "node:http";
import test, { after, before } from "node:test";

import type { INestApplication } from "@nestjs/common";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import "reflect-metadata";
import { DataSource } from "typeorm";

import { runMigrations } from "../src/common/database/migration-runner.ts";
import { DemoDataStore } from "../src/common/demo-data/demo-data.store.ts";
import { MetricsController } from "../src/modules/metrics/metrics.controller.ts";
import { MetricsService } from "../src/modules/metrics/metrics.service.ts";

// HTTP-слой GET /metrics против настоящего Postgres: метрики читаются из тех же
// таблиц, что и приложение, поэтому проверка требует изолированной схемы.

@Module({
  controllers: [MetricsController],
  providers: [
    MetricsService,
    {
      provide: DataSource,
      useFactory: () => {
        return db;
      },
    },
  ],
})
class MetricsTestModule {}

const databaseUrl = process.env.TEST_DATABASE_URL;
const schema = `t_${randomUUID().replaceAll("-", "")}`;
const skip = !databaseUrl;

let db: DataSource;
let testApp: INestApplication | undefined;
let port = 0;

if (databaseUrl) {
  before(async () => {
    const admin = await new DataSource({
      type: "postgres",
      url: databaseUrl,
    }).initialize();
    await admin.query(`create schema ${schema}`);
    await admin.destroy();

    db = await new DataSource({
      type: "postgres",
      url: databaseUrl,
      extra: { options: `-c search_path=${schema}` },
    }).initialize();
    await runMigrations(db);

    const data = new DemoDataStore(db);
    await data.seed();
    await seedMetrics(db);

    testApp = await NestFactory.create(MetricsTestModule, { logger: false });
    await testApp.listen(0);
    const address = testApp.getHttpServer().address() as { port: number };
    port = address.port;
  });

  after(async () => {
    if (testApp) {
      await testApp.close();
    }
    await db.query(`drop schema ${schema} cascade`);
    await db.destroy();
  });
}

/** Наполняет изолированную схему контрольными заявками, задачами и событиями. */
async function seedMetrics(source: DataSource): Promise<void> {
  await source.query(
    `insert into applications(id, number, inn, product_id, amount, term_months, purpose, status, created_at, updated_at)
     values
       ($1, 'SC-METRICS-1', '7701234567', 'working_capital', 1000000, 12, 'working_capital', 'draft', now(), now()),
       ($2, 'SC-METRICS-2', '7701234567', 'working_capital', 2000000, 24, 'working_capital', 'funded', now(), now())`,
    ["app-m-1", "app-m-2"],
  );
  await source.query(
    "update applications set decision = '{}'::jsonb where id = $1",
    ["app-m-2"],
  );

  const startedAt = new Date(Date.now() - 60_000).toISOString();
  const finishedAt = new Date().toISOString();
  await source.query(
    `insert into scoring_jobs(id, application_id, status, idempotency_key, created_at, started_at, finished_at, attempts)
     values
       ($1, $2, 'succeeded', 'key-job-1', now(), $5, $6, 1),
       ($3, $2, 'failed', 'key-job-2', now(), null, null, 3),
       ($4, $2, 'queued', 'key-job-3', now(), null, null, 0)`,
    ["job-m-1", "app-m-1", "job-m-2", "job-m-3", startedAt, finishedAt],
  );

  await source.query(
    `insert into source_checks(job_id, source, status, error)
     values
       ($1, 'egrul', 'ok', null),
       ($1, 'bki', 'ok', null),
       ($2, 'fns', 'failed', 'Источник недоступен')`,
    ["job-m-1", "job-m-2"],
  );

  await source.query(
    `insert into application_events(event_key, application_id, kind, payload)
     values
       ('ev-m-1', $1, 'application_created', '{}'::jsonb),
       ('ev-m-2', $1, 'scoring_succeeded', '{}'::jsonb),
       ('ev-m-3', $1, 'status_changed', '{}'::jsonb)`,
    ["app-m-1"],
  );
}

function getMetrics(
  targetPort: number,
): Promise<{
  status: number;
  headers: http.IncomingHttpHeaders;
  body: string;
}> {
  return new Promise((resolve, reject) => {
    const request = http.get(
      `http://127.0.0.1:${targetPort}/metrics`,
      (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          resolve({
            status: response.statusCode ?? 0,
            headers: response.headers,
            body,
          });
        });
      },
    );
    request.on("error", reject);
  });
}

test(
  "GET /metrics отдаёт 200 и наблюдаемые метрики системы",
  { skip },
  async () => {
    const { status, headers, body } = await getMetrics(port);
    assert.equal(status, 200);
    assert.match(headers["content-type"] ?? "", /text\/plain/);

    assert.match(
      body,
      /# HELP smart_credit_applications Всего заявок в системе/,
    );
    assert.match(body, /smart_credit_applications 2/);
    assert.match(
      body,
      /smart_credit_applications_by_status\{status="draft"\} 1/,
    );
    assert.match(
      body,
      /smart_credit_applications_by_status\{status="funded"\} 1/,
    );
    assert.match(body, /smart_credit_decisions 1/);

    assert.match(body, /smart_credit_scoring_jobs 3/);
    assert.match(
      body,
      /smart_credit_scoring_jobs_by_outcome\{outcome="succeeded"\} 1/,
    );
    assert.match(
      body,
      /smart_credit_scoring_jobs_by_outcome\{outcome="failed"\} 1/,
    );
    assert.match(body, /smart_credit_scoring_queue_depth 1/);
    assert.match(body, /smart_credit_scoring_job_duration_ms_avg 60000/);
    assert.match(body, /smart_credit_scoring_job_duration_ms_max 60000/);

    assert.match(body, /smart_credit_application_events_total 3/);

    assert.match(body, /smart_credit_source_checks_total 3/);
    assert.match(body, /smart_credit_source_checks_failed_total 1/);

    assert.match(body, /smart_credit_autonomy_policies 4/);
    assert.match(
      body,
      /smart_credit_autonomy_policy_info\{product="working_capital",level="stable",revision="0"\} 1/,
    );
    assert.match(
      body,
      /smart_credit_autonomy_closed_cases\{product="working_capital"\} 482/,
    );
    assert.match(
      body,
      /smart_credit_autonomy_manual_overrides\{product="working_capital"\} 31/,
    );
    assert.match(
      body,
      /smart_credit_autonomy_drift_detected\{product="working_capital"\} 0/,
    );
  },
);
