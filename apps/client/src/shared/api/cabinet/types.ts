import type {
  Application,
  ApplicationInput,
  ClientAnswer,
  CompanyProfile,
  DemoAccount,
  ProductCatalog,
} from "@repo/contracts/cabinet";
import type { CompanyProfileResponse } from "@repo/contracts/company-profile";
import type { ClientReportDetail, ClientReportList, ClientReportQuery } from "@repo/contracts/client-reports";

/**
 * Всё, что кабинет клиента берёт у бэкенда. Реализация использует HTTP API.
 */
export interface CabinetApi {
  listDemoAccounts(): Promise<DemoAccount[]>;
  /** Текущая учётка или null, если клиент не вошёл. */
  currentAccount(): Promise<DemoAccount | null>;
  signIn(accountId: string): Promise<DemoAccount>;
  signOut(): Promise<void>;

  getCatalog(): Promise<ProductCatalog>;
  getCompanyProfile(inn: string): Promise<CompanyProfileResponse>;
  grantBkiConsent(inn: string): Promise<CompanyProfileResponse>;
  /** Выписка ЕГРЮЛ/ЕГРИП по ИНН. */
  lookupCompany(inn: string): Promise<CompanyProfile>;

  listApplications(): Promise<Application[]>;
  getApplication(id: string): Promise<Application>;
  createApplication(input: ApplicationInput): Promise<Application>;
  // Команды по заявке принимают ключ идемпотентности: повтор с ним не выполняется дважды.
  answerRequest(
    id: string,
    requestId: string,
    answer: ClientAnswer,
    idempotencyKey: string,
  ): Promise<Application>;
  acceptOffer(id: string, idempotencyKey: string): Promise<Application>;
  declineOffer(id: string, idempotencyKey: string): Promise<Application>;
  /** Отправить код подтверждения. В прототипе код возвращается в ответе. */
  requestSignCode(
    id: string,
    idempotencyKey: string,
  ): Promise<{ demoCode: string }>;
  sign(id: string, code: string, idempotencyKey: string): Promise<Application>;
  /** Срочный режим по заявке клиента: включение требует причину. */
  setUrgent(
    id: string,
    enabled: boolean,
    reason: string,
    idempotencyKey: string,
  ): Promise<Application>;
  listClientReports(query?: Partial<ClientReportQuery>): Promise<ClientReportList>;
  getClientReport(id: string): Promise<ClientReportDetail>;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
