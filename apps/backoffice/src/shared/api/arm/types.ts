import type {
  ApiAutonomyAudit,
  ApiAutonomySnapshot,
  AutonomyPolicyActionRequest,
} from "@repo/contracts/api";
import type {
  Application,
  ClientResponse,
  Employee,
  EmployeeAction,
} from "@repo/contracts/application";
import type { CompanyProfileResponse } from "@repo/contracts/company-profile";
import type { CreditProduct } from "@repo/contracts/product-catalog";
import type {
  ManagerReportResponse,
  ReportView,
} from "@repo/contracts/reports";

/** Продукт каталога и его ставка при текущей ключевой: ключевая + спред. */
export type ArmProduct = CreditProduct & { ratePct: number };

/** Всё, что АРМ спрашивает у бэкенда через HTTP API. */
export interface ArmApi {
  listApplications(): Promise<Application[]>;
  getApplication(id: string): Promise<Application>;
  getCompanyProfile(inn: string): Promise<CompanyProfileResponse>;
  act(
    id: string,
    action: EmployeeAction,
    employeeId: string,
  ): Promise<Application>;
  /** Ответ клиента вместо кабинета клиента. В HTTP-режиме его делает кабинет. */
  simulateClient(id: string, response: ClientResponse): Promise<Application>;
  listProducts(): Promise<ArmProduct[]>;
  listEmployees(): Promise<Employee[]>;
  /** Открыть сессию сотрудника: без неё API не принимает команды. */
  signInEmployee(employeeId: string): Promise<Employee>;
  signOutEmployee(): Promise<void>;
  /** Сотрудник текущей сессии, null если сессии нет или она истекла. */
  currentEmployee(): Promise<Employee | null>;
  /** Вернуть демо-данные к началу. */
  reset(): Promise<void>;
  listAutonomyPolicies(): Promise<ApiAutonomySnapshot[]>;
  getAutonomyPolicy(productId: string): Promise<ApiAutonomySnapshot>;
  listAutonomyAudit(productId: string): Promise<ApiAutonomyAudit[]>;
  applyAutonomyPolicyAction(
    productId: string,
    request: AutonomyPolicyActionRequest,
  ): Promise<ApiAutonomySnapshot>;
  getManagerReport(query?: {
    view?: ReportView;
    cursor?: string;
    actor?: string;
    limit?: number;
  }): Promise<ManagerReportResponse>;
}
