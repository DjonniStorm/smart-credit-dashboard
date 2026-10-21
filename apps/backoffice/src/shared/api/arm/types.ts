import type {
  Application,
  ClientResponse,
  CreditProduct,
  Employee,
  EmployeeAction,
} from "@repo/contracts/application";

/** Всё, что АРМ спрашивает у бэкенда. Мок и HTTP реализуют один интерфейс. */
export interface ArmApi {
  listApplications(): Promise<Application[]>;
  getApplication(id: string): Promise<Application>;
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
