import { Injectable, UnauthorizedException } from "@nestjs/common";
import { randomUUID } from "node:crypto";

import type { DemoSession } from "@repo/contracts/api";

import { DemoDataStore } from "../../common/demo-data/demo-data.store.ts";

@Injectable()
export class AuthService {
  constructor(private readonly data: DemoDataStore) {}

  listAccounts() {
    return this.data.listAccounts();
  }

  async signIn(accountId: string): Promise<{ token: string; session: DemoSession }> {
    const account = await this.data.getAccount(accountId);
    if (!account) {
      throw new UnauthorizedException("Демо-учётная запись не найдена");
    }
    const token = randomUUID();
    const role: DemoSession["role"] = "client";
    await this.data.createSession(account.id, role, token);
    return { token, session: { account, role } };
  }

  async session(token: string | undefined): Promise<DemoSession> {
    if (!token) {
      throw new UnauthorizedException("Сессия не найдена");
    }
    const session = await this.data.getSession(token);
    if (!session) {
      throw new UnauthorizedException("Сессия истекла или не существует");
    }
    return session;
  }

  signOut(token: string | undefined): Promise<void> {
    return token ? this.data.deleteSession(token) : Promise.resolve();
  }
}
