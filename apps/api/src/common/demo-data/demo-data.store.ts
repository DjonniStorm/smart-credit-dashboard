import { Injectable, OnModuleInit } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import type { DataSource } from "typeorm";

import type {
  ApiProductCatalog,
  DemoAccountApi,
  DemoSession,
} from "@repo/contracts/api";
import type { Employee } from "@repo/contracts/application";

import {
  demoAccounts,
  demoCatalog,
  demoEmployees,
  demoSources,
  type DemoSourceRecord,
} from "./demo-data.ts";

@Injectable()
export class DemoDataStore implements OnModuleInit {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  async onModuleInit(): Promise<void> {
    await this.ensureSchema();
  }

  async listAccounts(): Promise<DemoAccountApi[]> {
    const rows = await this.db.query("select payload from demo_accounts order by id");
    return rows.length > 0
      ? rows.map((row: { payload: DemoAccountApi }) => row.payload)
      : [];
  }

  async getAccount(id: string): Promise<DemoAccountApi | null> {
    const rows = await this.db.query("select payload from demo_accounts where id=$1", [id]);
    return rows[0]?.payload ?? null;
  }

  async getCatalog(): Promise<ApiProductCatalog> {
    const rows = await this.db.query(
      "select payload from demo_catalog where id='default'",
    );
    return rows[0]?.payload ?? { ...demoCatalog, products: [] };
  }

  async listEmployees(): Promise<Employee[]> {
    const rows = await this.db.query("select payload from demo_employees order by id");
    return rows.length > 0 ? rows.map((row: { payload: Employee }) => row.payload) : [];
  }

  async getSources(inn: string): Promise<DemoSourceRecord | null> {
    const rows = await this.db.query(
      "select payload from demo_sources where inn=$1",
      [inn],
    );
    return rows[0]?.payload ?? null;
  }

  async createSession(accountId: string, role: DemoSession["role"], token: string): Promise<void> {
    await this.db.query(
      `insert into demo_sessions(token, account_id, role, created_at)
       values($1,$2,$3,now())`,
      [token, accountId, role],
    );
  }

  async getSession(token: string): Promise<DemoSession | null> {
    const rows = await this.db.query(
      `select a.payload, s.role from demo_sessions s
       join demo_accounts a on a.id=s.account_id
       where s.token=$1`,
      [token],
    );
    if (!rows[0]) {
      return null;
    }
    return { account: rows[0].payload, role: rows[0].role };
  }

  async deleteSession(token: string): Promise<void> {
    await this.db.query("delete from demo_sessions where token=$1", [token]);
  }

  async seed(): Promise<void> {
    await this.ensureSchema();
    for (const account of demoAccounts) {
      await this.db.query(
        `insert into demo_accounts(id,payload) values($1,$2)
         on conflict(id) do update set payload=excluded.payload`,
        [account.id, account],
      );
    }
    await this.db.query(
      `insert into demo_catalog(id,payload) values('default',$1)
       on conflict(id) do update set payload=excluded.payload`,
      [demoCatalog],
    );
    for (const employee of demoEmployees) {
      await this.db.query(
        `insert into demo_employees(id,payload) values($1,$2)
         on conflict(id) do update set payload=excluded.payload`,
        [employee.id, employee],
      );
    }
    for (const [inn, sources] of Object.entries(demoSources)) {
      await this.db.query(
        `insert into demo_sources(inn,payload) values($1,$2)
         on conflict(inn) do update set payload=excluded.payload`,
        [inn, sources],
      );
    }
  }

  private async ensureSchema(): Promise<void> {
    await this.db.query(`
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
    `);
  }
}
