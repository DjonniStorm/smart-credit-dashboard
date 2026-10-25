import type { DataSource } from "typeorm";

import type { ApplicationWorkflow } from "@repo/contracts/workflow";

import { applicationFromRow } from "./workflow-rows.ts";

/** Фильтр компании применяется до загрузки и преобразования строк. */
export class WorkflowReadStore {
  constructor(private readonly db: DataSource) {}

  async list(inn?: string): Promise<ApplicationWorkflow[]> {
    const rows = await this.db.query(
      inn === undefined
        ? "select * from applications order by created_at desc"
        : "select * from applications where inn=$1 order by created_at desc",
      inn === undefined ? [] : [inn],
    );
    return rows.map(applicationFromRow);
  }

  async get(id: string, inn?: string): Promise<ApplicationWorkflow | null> {
    const rows = await this.db.query(
      inn === undefined
        ? "select * from applications where id=$1"
        : "select * from applications where id=$1 and inn=$2",
      inn === undefined ? [id] : [id, inn],
    );
    return rows[0] ? applicationFromRow(rows[0]) : null;
  }
}
