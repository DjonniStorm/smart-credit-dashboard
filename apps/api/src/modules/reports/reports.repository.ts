import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource, EntityManager } from "typeorm";

type DatabaseRow = Record<string, unknown>;

export type ReportEventRow = {
  eventId: string;
  applicationId: string;
  applicationNumber: string;
  occurredAt: string;
  kind: string;
  payload: Record<string, unknown>;
  productId: string;
  status: string;
  amount: number;
  assigneeId: string | null;
};

export type ReportCommentRow = {
  eventId: string;
  applicationId: string;
  applicationNumber: string;
  occurredAt: string;
  payload: Record<string, unknown>;
  productId: string;
  status: string;
  assigneeId: string | null;
};

export type ReportApplicationRow = {
  applicationId: string;
  applicationNumber: string;
  createdAt: string;
  updatedAt: string;
  productId: string;
  status: string;
  amount: number;
  assigneeId: string | null;
  urgent: boolean;
  hold: Record<string, unknown> | null;
};

export type ReportWatermark = {
  occurredAt: string;
  eventId: string;
};

export type ReportData = {
  applications: ReportApplicationRow[];
  events: ReportEventRow[];
  comments: ReportCommentRow[];
  watermark: ReportWatermark | null;
};

function rowsOf(result: unknown): DatabaseRow[] {
  if (Array.isArray(result) && Array.isArray(result[0])) {
    return result[0] as DatabaseRow[];
  }
  return result as DatabaseRow[];
}

function jsonObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function nullableString(value: unknown): string | null {
  return value === null || value === undefined ? null : String(value);
}

function applicationFromRow(row: DatabaseRow): ReportApplicationRow {
  return {
    applicationId: String(row.id),
    applicationNumber: String(row.number),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
    productId: String(row.product_id),
    status: String(row.status),
    amount: Number(row.amount),
    assigneeId: nullableString(row.assignee_id),
    urgent: Boolean(row.urgent),
    hold: row.hold ? jsonObject(row.hold) : null,
  };
}

function eventFromRow(row: DatabaseRow): ReportEventRow {
  return {
    eventId: String(row.event_id),
    applicationId: String(row.application_id),
    applicationNumber: String(row.application_number),
    occurredAt: new Date(String(row.occurred_at)).toISOString(),
    kind: String(row.kind),
    payload: jsonObject(row.payload),
    productId: String(row.product_id),
    status: String(row.status),
    amount: Number(row.amount),
    assigneeId: nullableString(row.assignee_id),
  };
}

function commentFromRow(row: DatabaseRow): ReportCommentRow {
  const author = jsonObject(row.author);
  return {
    eventId: `comment:${String(row.comment_id)}`,
    applicationId: String(row.application_id),
    applicationNumber: String(row.application_number),
    occurredAt: new Date(String(row.occurred_at)).toISOString(),
    payload: {
      comment: String(row.body),
      actorKind: String(author.kind ?? "employee"),
      actorId: nullableString(author.id),
      actorName: String(author.name ?? "Сотрудник"),
      visibility: String(row.visibility),
      actionType: "comment",
    },
    productId: String(row.product_id),
    status: String(row.status),
    assigneeId: nullableString(row.assignee_id),
  };
}

@Injectable()
export class ReportsRepository {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  async read(
    from: string,
    to: string,
    watermark: ReportWatermark | null,
    manager?: EntityManager,
  ): Promise<ReportData> {
    const connection = manager ?? this.db.manager;
    const maxEventId = watermark ? Number(watermark.eventId) : 0;
    const applications = rowsOf(
      await connection.query(
        `select id, number, created_at, updated_at, product_id, status, amount,
                assignee_id, urgent, hold
           from applications
          where created_at >= $1 and created_at < $2
          order by created_at, id`,
        [from, to],
      ),
    ).map(applicationFromRow);
    const events = maxEventId
      ? rowsOf(
          await connection.query(
            `select e.id as event_id, e.application_id, e.kind,
                    e.payload, e.created_at as occurred_at,
                    a.number as application_number, a.product_id,
                    a.status, a.amount, a.assignee_id
               from application_events e
               join applications a on a.id = e.application_id
              where e.created_at >= $1 and e.created_at < $2 and e.id <= $3
              order by e.created_at, e.id`,
            [from, to, maxEventId],
          ),
        ).map(eventFromRow)
      : [];
    const comments = rowsOf(
      await connection.query(
        `select c.id as comment_id, c.application_id, c.visibility,
                c.author, c.body, c.created_at as occurred_at,
                a.number as application_number, a.product_id,
                a.status, a.assignee_id
           from application_comments c
           join applications a on a.id = c.application_id
          where c.created_at >= $1 and c.created_at < $2
          order by c.created_at, c.id`,
        [from, to],
      ),
    ).map(commentFromRow);
    return { applications, events, comments, watermark };
  }

  async watermark(
    from: string,
    to: string,
    manager?: EntityManager,
  ): Promise<ReportWatermark | null> {
    const connection = manager ?? this.db.manager;
    const rows = rowsOf(
      await connection.query(
        `select id, created_at from application_events
          where created_at >= $1 and created_at < $2
          order by created_at desc, id desc limit 1`,
        [from, to],
      ),
    );
    const row = rows[0];
    return row
      ? {
          occurredAt: new Date(String(row.created_at)).toISOString(),
          eventId: String(row.id),
        }
      : null;
  }

  async readConsistent(from: string, to: string): Promise<ReportData> {
    return this.db.transaction(async (manager) => {
      const watermark = await this.watermark(from, to, manager);
      return this.read(from, to, watermark, manager);
    });
  }
}
