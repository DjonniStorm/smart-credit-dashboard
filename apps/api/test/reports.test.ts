import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";

import { DataSource } from "typeorm";

import { runMigrations } from "../src/common/database/migration-runner.ts";
import {
  metadataQuality,
  populationRecord,
  stageOf,
} from "../src/modules/reports/report-helpers.ts";
import {
  decodeReportCursor,
  encodeReportCursor,
  parseManagerReportQuery,
  reportQueryHash,
} from "../src/modules/reports/report-query.ts";
import { ReportSeriesCalculator } from "../src/modules/reports/report-series.ts";
import { ReportsRepository } from "../src/modules/reports/reports.repository.ts";

describe("manager report query", () => {
  it("uses a bounded default period and preserves the timezone", () => {
    const now = new Date("2026-10-24T12:00:00.000Z");
    const query = parseManagerReportQuery(
      { timezone: "Europe/Astrakhan", view: "journal" },
      now,
    );

    assert.equal(query.to, now.toISOString());
    assert.equal(query.timezone, "Europe/Astrakhan");
    assert.equal(query.view, "journal");
    assert.equal(query.search, "");
    assert.equal(
      new Date(query.to).getTime() - new Date(query.from).getTime(),
      30 * 24 * 60 * 60 * 1000,
    );
  });

  it("rejects a period longer than one year", () => {
    assert.throws(() =>
      parseManagerReportQuery({
        from: "2024-01-01T00:00:00.000Z",
        to: "2026-01-01T00:00:00.000Z",
      }),
    );
  });

  it("binds a cursor to the full query and watermark", () => {
    const query = parseManagerReportQuery({
      from: "2026-10-01T00:00:00.000Z",
      to: "2026-10-24T00:00:00.000Z",
      search: "SC-DEMO",
    });
    const cursor = encodeReportCursor({
      occurredAt: "2026-10-20T10:00:00.000Z",
      eventId: "42",
      queryHash: reportQueryHash(query),
      watermark: {
        snapshotSeq: "99",
        occurredAt: "2026-10-24T00:00:00.000Z",
        eventId: "99",
      },
    });

    assert.deepEqual(decodeReportCursor(cursor, reportQueryHash(query)), {
      occurredAt: "2026-10-20T10:00:00.000Z",
      eventId: "42",
      queryHash: reportQueryHash(query),
      watermark: {
        snapshotSeq: "99",
        occurredAt: "2026-10-24T00:00:00.000Z",
        eventId: "99",
      },
    });
    assert.throws(() => decodeReportCursor(cursor, "different-query"));
  });
});

describe("historical report fields", () => {
  it("uses the event snapshot stage instead of the current application", () => {
    const record = populationRecord({
      applicationId: "app-1",
      applicationNumber: "SC-1",
      createdAt: "2026-10-01T00:00:00.000Z",
      productId: "working_capital",
      amount: 100,
      status: "in_review",
      stage: "decision",
      assigneeId: null,
      urgent: false,
    });

    assert.equal(stageOf(record), "decision");
    assert.equal(metadataQuality(record), "partial");
  });

  it("does not count comments as SLA observations", () => {
    const query = parseManagerReportQuery({
      from: "2026-10-01T00:00:00.000Z",
      to: "2026-10-24T00:00:00.000Z",
    });
    const series = new ReportSeriesCalculator().sla(
      [
        {
          eventId: "1",
          applicationId: "app-1",
          applicationNumber: "SC-1",
          occurredAt: "2026-10-10T00:00:00.000Z",
          kind: "status_changed",
          payload: {
            reportContext: { stage: "intake", slaState: "overdue" },
          },
          productId: "working_capital",
          status: "in_review",
          amount: 100,
          assigneeId: null,
          source: "event",
          stage: "intake",
          slaState: "overdue",
        },
        {
          eventId: "2",
          applicationId: "app-1",
          applicationNumber: "SC-1",
          occurredAt: "2026-10-11T00:00:00.000Z",
          kind: "comment_added",
          payload: { comment: "Пауза" },
          productId: "working_capital",
          status: "unknown",
          amount: 100,
          assigneeId: null,
          source: "comment",
          slaState: "unknown",
        },
        {
          eventId: "3",
          applicationId: "app-1",
          applicationNumber: "SC-1",
          occurredAt: "2026-10-12T00:00:00.000Z",
          kind: "scoring_failed",
          payload: { reportContext: { stage: "scoring", slaState: "overdue" } },
          productId: "working_capital",
          status: "in_review",
          amount: 100,
          assigneeId: null,
          source: "event",
          stage: "scoring",
          slaState: "overdue",
        },
      ],
      query,
    );

    assert.equal(
      series.byState.reduce((sum, item) => sum + item.count, 0),
      1,
    );
    assert.equal(series.byState[0]?.state, "overdue");
  });
});

const databaseUrl = process.env.TEST_DATABASE_URL;
const databaseRequired = Boolean(process.env.CI);

describe(
  "журнал на Postgres",
  {
    skip:
      databaseUrl || databaseRequired ? false : "TEST_DATABASE_URL не задан",
  },
  () => {
    const schema = `t_${randomUUID().replaceAll("-", "")}`;
    let db: DataSource;

    before(async () => {
      const admin = new DataSource({ type: "postgres", url: databaseUrl });
      await admin.initialize();
      await admin.query(`create schema ${schema}`);
      await admin.destroy();
      db = new DataSource({
        type: "postgres",
        url: databaseUrl,
        extra: { options: `-c search_path=${schema}` },
      });
      await db.initialize();
      await runMigrations(db);
    });

    after(async () => {
      await db.query(`drop schema ${schema} cascade`);
      await db.destroy();
    });

    it("не теряет событие с report_seq больше последнего в периоде и отдаёт номер заявки", async () => {
      await db.query(
        `insert into applications (
           id, number, inn, product_id, amount, term_months, purpose, status,
           created_at, updated_at
         ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          "app-journal-test",
          "SC-JOURNAL-1",
          "7700000000",
          "working_capital",
          100000,
          12,
          "working_capital",
          "in_review",
          "2026-10-01T00:00:00.000Z",
          "2026-10-01T00:00:00.000Z",
        ],
      );
      // Событие A позже по времени, но с меньшим report_seq (100), событие B
      // раньше по времени с большим report_seq (105). Водяной знак смотрит на
      // последнее по occurred_at событие, поэтому фильтр по report_seq отрезал
      // бы B, хотя оно в периоде и учитывается в сводке.
      await db.query(
        `insert into application_events (
           application_id, kind, payload, created_at, report_seq
         ) values
           ($1, 'status_changed', '{"title": "A"}', $2, 105),
           ($1, 'status_changed', '{"title": "B"}', $3, 100)`,
        [
          "app-journal-test",
          "2026-10-10T10:00:00.000Z",
          "2026-10-10T11:00:00.000Z",
        ],
      );

      const query = parseManagerReportQuery({
        from: "2026-10-01T00:00:00.000Z",
        to: "2026-10-24T00:00:00.000Z",
        view: "journal",
        limit: "1",
      });
      const repository = new ReportsRepository(db);

      const firstPage = await repository.readConsistent(query, null, null);
      assert.equal(firstPage.records.length, 2);
      const pageOne = firstPage.records.slice(0, query.limit);
      assert.equal(pageOne[0]!.eventId, "100");
      assert.equal(pageOne[0]!.applicationNumber, "SC-JOURNAL-1");

      const last = pageOne.at(-1)!;
      const secondPage = await repository.readConsistent(
        query,
        { occurredAt: last.occurredAt, eventId: last.eventId },
        firstPage.watermark,
      );
      assert.equal(secondPage.records.length, 1);
      assert.equal(secondPage.records[0]!.eventId, "105");
      assert.equal(secondPage.records[0]!.applicationNumber, "SC-JOURNAL-1");
    });
  },
);
