import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type {
  BkiReport,
  EgrulRecord,
  FnsProfile,
} from "@repo/contracts";
import type {
  CompanyFact,
  CompanyProfile,
  CompanyProfileResponse,
  CompanySource,
  CompanySourceSnapshot,
} from "@repo/contracts/company-profile";

import type { Env } from "../../common/config/env.schema.ts";
import { CompanyConsentStore } from "./company-consent.store.ts";

interface SourceRequestResult<T> {
  value: T | null;
  checkedAt: string;
}

@Injectable()
export class CompanyProfileService {
  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly consents: CompanyConsentStore,
  ) {}

  async getProfile(inn: string): Promise<CompanyProfileResponse> {
    const grantedAt = await this.consents.grantedAt(inn);
    const egrul = await this.requestSource<EgrulRecord>("egrul", inn);
    const fns = await this.requestSource<FnsProfile>("fns", inn);
    const profile = this.buildProfile(inn, egrul.value);
    const sources = [
      this.egrulSnapshot(egrul),
      this.fnsSnapshot(fns),
      this.turnoverSnapshot(),
    ];

    if (grantedAt) {
      const bki = await this.requestSource<BkiReport>("bki", inn);
      sources.push(this.bkiSnapshot(bki));
    } else {
      sources.push({
        source: "bki",
        state: "pending",
        summary: "Нужно согласие на запрос данных БКИ",
        facts: [],
        checkedAt: null,
      });
    }

    return {
      profile,
      sources,
      bkiConsent: {
        status: grantedAt ? "granted" : "required",
        grantedAt,
      },
    };
  }

  async grantBkiConsent(inn: string): Promise<CompanyProfileResponse> {
    await this.consents.grant(inn, new Date().toISOString());
    return this.getProfile(inn);
  }

  private async requestSource<T>(
    source: CompanySource,
    inn: string,
  ): Promise<SourceRequestResult<T>> {
    const mocksUrl = this.config.getOrThrow("MOCKS_URL", { infer: true });
    const checkedAt = new Date().toISOString();

    try {
      const response = await fetch(`${mocksUrl}/${source}/${inn}`, {
        signal: AbortSignal.timeout(5_000),
      });
      if (!response.ok) {
        return { value: null, checkedAt };
      }
      return { value: (await response.json()) as T, checkedAt };
    } catch {
      return { value: null, checkedAt };
    }
  }

  private buildProfile(inn: string, source: EgrulRecord | null): CompanyProfile {
    return {
      inn,
      ogrn: source?.ogrn ?? "Не получен",
      name: source?.name ?? "Компания не подтверждена",
      legalForm: "ooo",
      registeredAt: source?.registeredAt ?? "Не получена",
      okved: source?.okved ?? "Не получен",
      region: "Москва",
      address: "Адрес будет подтверждён при проверке источника",
      director: "Руководитель будет подтверждён при проверке источника",
    };
  }

  private egrulSnapshot(
    result: SourceRequestResult<EgrulRecord>,
  ): CompanySourceSnapshot {
    const facts: CompanyFact[] = result.value
      ? [
          this.fact("status", "Статус", result.value.status, "egrul", result.checkedAt),
          this.fact("okved", "ОКВЭД", result.value.okved, "egrul", result.checkedAt),
        ]
      : [];
    return this.snapshot(
      "egrul",
      result,
      facts,
      "Данные ЕГРЮЛ/ЕГРИП подтверждены",
    );
  }

  private fnsSnapshot(
    result: SourceRequestResult<FnsProfile>,
  ): CompanySourceSnapshot {
    const facts: CompanyFact[] = result.value
      ? [
          this.fact(
            "tax_debt",
            "Налоговая задолженность",
            `${result.value.taxDebtRub} ₽`,
            "fns",
            result.checkedAt,
          ),
          this.fact(
            "employees",
            "Сотрудники",
            String(result.value.employees),
            "fns",
            result.checkedAt,
          ),
        ]
      : [];
    return this.snapshot("fns", result, facts, "Данные ФНС получены");
  }

  private bkiSnapshot(
    result: SourceRequestResult<BkiReport>,
  ): CompanySourceSnapshot {
    const facts: CompanyFact[] = result.value
      ? [
          this.fact(
            "active_loans",
            "Активные кредиты",
            String(result.value.activeLoans),
            "bki",
            result.checkedAt,
          ),
          this.fact(
            "overdue_days",
            "Просрочка",
            `${result.value.overdueDays} дней`,
            "bki",
            result.checkedAt,
          ),
        ]
      : [];
    return this.snapshot("bki", result, facts, "Данные БКИ получены");
  }

  private turnoverSnapshot(): CompanySourceSnapshot {
    const checkedAt = new Date().toISOString();
    return {
      source: "bank_turnover",
      state: "confirmed",
      summary: "Обороты по расчётному счёту доступны банку",
      facts: [
        this.fact(
          "avg_monthly_turnover",
          "Средний месячный оборот",
          "2 400 000 ₽",
          "bank_turnover",
          checkedAt,
        ),
      ],
      checkedAt,
    };
  }

  private fact(
    key: string,
    label: string,
    value: string,
    source: CompanySource,
    checkedAt: string,
  ): CompanyFact {
    return { key, label, value, source, state: "confirmed", checkedAt };
  }

  private snapshot<T>(
    source: CompanySource,
    result: SourceRequestResult<T>,
    facts: CompanyFact[],
    summary: string,
  ): CompanySourceSnapshot {
    if (!result.value) {
      return {
        source,
        state: "manual_check",
        summary: "Источник недоступен, нужна ручная проверка",
        facts: [],
        checkedAt: result.checkedAt,
      };
    }
    return { source, state: "confirmed", summary, facts, checkedAt: result.checkedAt };
  }
}
