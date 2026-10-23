import type {
  Application,
  ApplicationInput,
  ClientAnswer,
  CompanyProfile,
  DemoAccount,
  ProductCatalog,
} from "@repo/contracts/cabinet";
import type { CompanyProfileResponse } from "@repo/contracts/company-profile";

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
  answerRequest(
    id: string,
    requestId: string,
    answer: ClientAnswer,
  ): Promise<Application>;
  acceptOffer(id: string): Promise<Application>;
  declineOffer(id: string): Promise<Application>;
  /** Отправить код подтверждения. В прототипе код возвращается в ответе. */
  requestSignCode(id: string): Promise<{ demoCode: string }>;
  sign(id: string, code: string): Promise<Application>;
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
