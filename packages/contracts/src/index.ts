// Общие типы HTTP-контрактов между сервисами.
// Пакет Just-in-Time: потребители импортируют .ts напрямую, сборки нет.
// Используйте только `import type`, чтобы в рантайме Node не было импорта .ts.

export type ServiceName = "api" | "scoring" | "mocks";

export interface HealthResponse {
  status: "ok" | "degraded";
  service: ServiceName;
  checks?: Record<string, "up" | "down">;
}

/** Заглушка ЕГРЮЛ/ЕГРИП. */
export interface EgrulRecord {
  inn: string;
  ogrn: string;
  name: string;
  status: string;
  registeredAt: string;
  okved: string;
}

/** Заглушка бюро кредитных историй. */
export interface BkiReport {
  inn: string;
  activeLoans: number;
  totalDebtRub: number;
  overdueDays: number;
}

/** Заглушка ФНС «Прозрачный бизнес». */
export interface FnsProfile {
  inn: string;
  taxDebtRub: number;
  employees: number;
  massRegistrationAddress: boolean;
}

export interface ScoreRequest {
  inn: string;
  egrul: EgrulRecord;
  bki: BkiReport;
  fns: FnsProfile;
}

export interface ScoreResponse {
  inn: string;
  score: number;
  model: string;
}

/** Сквозная ручка client -> api -> mocks + scoring. */
export interface CompanyCheckResponse {
  inn: string;
  sources: {
    egrul: EgrulRecord;
    bki: BkiReport;
    fns: FnsProfile;
  };
  scoring: ScoreResponse;
}
