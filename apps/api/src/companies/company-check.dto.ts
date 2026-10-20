import type {
  BkiReport,
  CompanyCheckResponse,
  EgrulRecord,
  FnsProfile,
  ScoreResponse,
} from "@repo/contracts";

export class EgrulRecordDto implements EgrulRecord {
  inn: string;
  ogrn: string;
  name: string;
  status: string;
  registeredAt: string;
  okved: string;
}

export class BkiReportDto implements BkiReport {
  inn: string;
  activeLoans: number;
  totalDebtRub: number;
  overdueDays: number;
}

export class FnsProfileDto implements FnsProfile {
  inn: string;
  taxDebtRub: number;
  employees: number;
  massRegistrationAddress: boolean;
}

export class ScoreResponseDto implements ScoreResponse {
  inn: string;
  score: number;
  model: string;
}

export class CompanySourcesDto {
  egrul: EgrulRecordDto;
  bki: BkiReportDto;
  fns: FnsProfileDto;
}

export class CompanyCheckDto implements CompanyCheckResponse {
  inn: string;
  sources: CompanySourcesDto;
  scoring: ScoreResponseDto;
}
