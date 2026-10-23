import type {
  Application,
  ClientResponse,
  CreditProduct,
  Employee,
  EmployeeAction,
} from "@repo/contracts/application";
import type { CompanyProfileResponse } from "@repo/contracts/company-profile";

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
  listProducts(): Promise<CreditProduct[]>;
  listEmployees(): Promise<Employee[]>;
  /** Вернуть демо-данные к началу. */
  reset(): Promise<void>;
}
