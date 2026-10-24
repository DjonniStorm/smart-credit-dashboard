import { BadRequestException, Injectable } from "@nestjs/common";
import { createHmac, timingSafeEqual } from "node:crypto";
import { ConfigService } from "@nestjs/config";
import type { DemoSession } from "@repo/contracts/api";
import { clientReportEventKindSchema, clientReportStatusSchema, type ClientReportDetail, type ClientReportQuery } from "@repo/contracts/client-reports";
import type { Env } from "../../common/config/env.schema.ts";

import { ClientApplicationScopeService } from "../applications/client-application-scope.service.ts";
import { WorkflowStore } from "../applications/workflow-store.ts";

const eventText: Record<string, string> = {
  application_created: "Заявка создана",
  check_requested: "Проверка данных запущена",
  scoring_completed: "Проверка данных завершена",
  client_action: "Действие клиента принято",
};
const publicEventText = new Map(Object.entries(eventText));

@Injectable()
export class ClientReportsService {
  constructor(private readonly scope: ClientApplicationScopeService, private readonly store: WorkflowStore, private readonly config: ConfigService<Env, true>) {}

  async list(session: DemoSession, query: ClientReportQuery) {
    const applications = (await this.scope.list(session)).filter((item) =>
      (query.status.length === 0 || query.status.includes(item.status as never)) &&
      (!query.from || item.updatedAt >= query.from) && (!query.to || item.updatedAt < query.to),
    );
    const watermark = query.cursor ? this.decodeCursor(query.cursor).watermark : new Date().toISOString();
    const visible = applications.filter((item) => item.updatedAt <= watermark).sort((a, b) => a.updatedAt.localeCompare(b.updatedAt) || a.id.localeCompare(b.id));
    const after = query.cursor ? this.decodeCursor(query.cursor) : null;
    const start = after ? visible.findIndex((item) => item.updatedAt > after.updatedAt || (item.updatedAt === after.updatedAt && item.id > after.id)) : 0;
    const items = visible.slice(start < 0 ? visible.length : start, (start < 0 ? visible.length : start) + query.limit).map((item) => this.publicApplication(item));
    const last = items.at(-1);
    return { items, nextCursor: last && items.length === query.limit ? this.encodeCursor({ watermark, updatedAt: last.updatedAt, id: last.id }) : null, watermark };
  }

  async detail(session: DemoSession, id: string): Promise<ClientReportDetail> {
    const application = await this.scope.get(session, id);
    const events = await this.store.listEvents(id);
    return {
      application: this.publicApplication(application),
      events: events.filter((event) => clientReportEventKindSchema.safeParse(event.kind).success).map((event) => ({ id: event.id, at: event.at, text: publicEventText.get(event.kind)! })),
      changes: events.filter((event) => clientReportEventKindSchema.safeParse(event.kind).success).map((event) => ({ at: event.at, text: publicEventText.get(event.kind)! })),
    };
  }

  async csv(session: DemoSession, query: ClientReportQuery): Promise<string> {
    const result = await this.list(session, query);
    const rows = result.items.map((item) => [item.number, item.status, item.productId, item.amount, item.termMonths, item.createdAt].map((value) => this.csvCell(value)).join(","));
    return ["number,status,productId,amount,termMonths,createdAt", ...rows].join("\n");
  }

  private encodeCursor(value: { watermark: string; updatedAt: string; id: string }): string { const payload = Buffer.from(JSON.stringify(value), "utf8").toString("base64url"); return `${payload}.${this.sign(payload)}`; }
  private decodeCursor(cursor: string): { watermark: string; updatedAt: string; id: string } {
    try { const [payload, signature] = cursor.split("."); if (!payload || !signature || !timingSafeEqual(Buffer.from(signature), Buffer.from(this.sign(payload)))) throw new Error(); const value: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")); if (!value || typeof value !== "object" || !("watermark" in value) || !("updatedAt" in value) || !("id" in value) || typeof value.watermark !== "string" || typeof value.updatedAt !== "string" || typeof value.id !== "string" || Number.isNaN(Date.parse(value.watermark)) || Number.isNaN(Date.parse(value.updatedAt))) throw new Error(); return value as { watermark: string; updatedAt: string; id: string }; } catch { throw new BadRequestException("Некорректный cursor"); }
  }
  private sign(payload: string): string { return createHmac("sha256", this.config.getOrThrow("CLIENT_REPORT_CURSOR_SECRET", { infer: true })).update(payload).digest("base64url"); }
  private csvCell(value: unknown): string { const text = String(value).replace(/\r?\n/g, " "); const safe = /^[=+\-@]/.test(text) ? `'${text}` : text; return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe; }

  private publicApplication(application: { id: string; number: string; status: string; productId: string; amount: number; termMonths: number; createdAt: string; updatedAt: string }) {
    const status = clientReportStatusSchema.safeParse(application.status);
    return { id: application.id, number: application.number, status: status.success ? status.data : "in_review", productId: application.productId, amount: application.amount, termMonths: application.termMonths, createdAt: application.createdAt, updatedAt: application.updatedAt };
  }
}
