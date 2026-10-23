import { Injectable, OnModuleInit } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";

import { runMigrations } from "./migration-runner.ts";

@Injectable()
export class DatabaseService implements OnModuleInit {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    await runMigrations(this.dataSource);
  }

  async ping(): Promise<boolean> {
    try {
      await this.dataSource.query("select 1");
      return true;
    } catch {
      return false;
    }
  }
}
