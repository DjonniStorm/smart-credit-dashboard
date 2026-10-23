import type {
  Application,
  ClientResponse,
  Employee,
  EmployeeAction,
} from "@repo/contracts/application";
import type { CreditProduct } from "@repo/contracts/product-catalog";
import type { CompanyProfileResponse } from "@repo/contracts/company-profile";

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
  /** Вернуть демо-данные к началу. */
  reset(): Promise<void>;
}
