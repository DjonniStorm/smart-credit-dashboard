import { randomUUID } from "node:crypto";

import { Injectable, UnauthorizedException } from "@nestjs/common";

import type { DemoSession } from "@repo/contracts/api";
import type { Employee } from "@repo/contracts/application";

import { DemoDataStore } from "../../common/demo-data/demo-data.store.ts";

@Injectable()
export class AuthService {
  constructor(private readonly data: DemoDataStore) {}

  listAccounts() {
    return this.data.listAccounts();
  }

  async signIn(
    accountId: string,
  ): Promise<{ token: string; session: DemoSession }> {
    const account = await this.data.getAccount(accountId);
    if (!account) {
      throw new UnauthorizedException("Демо-учётная запись не найдена");
    }
    const token = randomUUID();
    const role: DemoSession["role"] = "client";
    await this.data.createSession(account.id, role, token);
    return { token, session: { account, role } };
  }

  /** Вход сотрудника АРМ: роль и лимит берутся из карточки сотрудника, а не из тела запроса. */
  async signInEmployee(
    employeeId: string,
  ): Promise<{ token: string; employee: Employee }> {
    const employee = await this.data.getEmployee(employeeId);
    if (!employee) {
      throw new UnauthorizedException("Сотрудник не найден");
    }
    const token = randomUUID();
    await this.data.createEmployeeSession(employee.id, token);
    return { token, employee };
  }

  async employeeSession(token: string | undefined): Promise<Employee> {
    if (!token) {
      throw new UnauthorizedException("Войдите как сотрудник");
    }
    const employee = await this.data.getEmployeeBySession(token);
    if (!employee) {
      throw new UnauthorizedException("Сессия сотрудника истекла");
    }
    return employee;
  }

  signOutEmployee(token: string | undefined): Promise<void> {
    return token ? this.data.deleteEmployeeSession(token) : Promise.resolve();
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
