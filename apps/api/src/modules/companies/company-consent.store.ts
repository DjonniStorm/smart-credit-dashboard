import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";

@Injectable()
export class CompanyConsentStore {
  private tableReady = false;

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async grantedAt(inn: string): Promise<string | null> {
    await this.ensureTable();
    const rows = (await this.dataSource.query(
      "select granted_at from company_bki_consents where inn = $1",
      [inn],
    )) as Array<{ granted_at: Date | string }>;
    const grantedAt = rows[0]?.granted_at;
    return grantedAt ? new Date(grantedAt).toISOString() : null;
  }

  async grant(inn: string, grantedAt: string): Promise<void> {
    await this.ensureTable();
    await this.dataSource.query(
      `insert into company_bki_consents (inn, granted_at)
       values ($1, $2)
       on conflict (inn) do update set granted_at = excluded.granted_at`,
      [inn, grantedAt],
    );
  }

  private async ensureTable(): Promise<void> {
    if (this.tableReady) {
      return;
    }

    await this.dataSource.query(`
      create table if not exists company_bki_consents (
        inn varchar(12) primary key,
        granted_at timestamptz not null
      )
    `);
    this.tableReady = true;
  }
}
