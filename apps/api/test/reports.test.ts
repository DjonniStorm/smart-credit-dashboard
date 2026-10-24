import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  decodeReportCursor,
  encodeReportCursor,
  parseManagerReportQuery,
  reportQueryHash,
} from "../src/modules/reports/report-query.ts";
import {
  metadataQuality,
  populationRecord,
  stageOf,
} from "../src/modules/reports/report-helpers.ts";
import { ReportSeriesCalculator } from "../src/modules/reports/report-series.ts";

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

    assert.equal(series.byState.reduce((sum, item) => sum + item.count, 0), 1);
    assert.equal(series.byState[0]?.state, "overdue");
  });
});
