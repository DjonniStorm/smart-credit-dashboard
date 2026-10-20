import { Injectable, type OnModuleDestroy } from "@nestjs/common";
import pg from "pg";
import { config } from "./config.js";

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  readonly pool = new pg.Pool({ connectionString: config.databaseUrl });

  async ping(): Promise<boolean> {
    try {
      await this.pool.query("select 1");
      return true;
    } catch {
      return false;
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
