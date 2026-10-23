import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import type { DataSource } from "typeorm";

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

import { DemoDataStore } from "../../common/demo-data/demo-data.store.ts";
import { CompanyConsentStore } from "./company-consent.store.ts";

@Injectable()
export class CompanyProfileService {
  constructor(
    private readonly data: DemoDataStore,
    private readonly consents: CompanyConsentStore,
    @InjectDataSource() private readonly db: DataSource,
  ) {}

  async getProfile(inn: string): Promise<CompanyProfileResponse> {
    const grantedAt = await this.consents.grantedAt(inn);
    const sourcesData = await this.data.getSources(inn);
    const scenario = this.data.getCompanyProfileScenario(inn);
    const account = (await this.data.listAccounts()).find(
      (candidate) => candidate.company.inn === inn,
    );
    const [egrulCheckedAt, fnsCheckedAt, turnoverCheckedAt, bkiCheckedAt] =
      await Promise.all([
        this.checkedAt(inn, "egrul"),
        this.checkedAt(inn, "fns"),
        this.checkedAt(inn, "bank_turnover"),
        grantedAt ? this.checkedAt(inn, "bki") : Promise.resolve(null),
      ]);
    const egrul = { value: sourcesData?.egrul ?? null, checkedAt: egrulCheckedAt };
    const fns = { value: sourcesData?.fns ?? null, checkedAt: fnsCheckedAt };
    const profile = this.buildProfile(inn, egrul.value, account);
    const sources = [
      this.egrulSnapshot(egrul, scenario.unavailableSources.includes("egrul"), scenario.discrepancies),
      this.fnsSnapshot(fns, scenario.unavailableSources.includes("fns"), scenario.discrepancies),
      this.turnoverSnapshot(turnoverCheckedAt),
    ];

    if (grantedAt) {
      const bki = { value: sourcesData?.bki ?? null, checkedAt: bkiCheckedAt };
      sources.push(this.bkiSnapshot(bki, scenario.unavailableSources.includes("bki"), scenario.discrepancies));
    } else {
      sources.push({
        source: "bki",
        state: "pending",
        summary: "Нужно согласие на запрос данных БКИ",
        facts: [],
        discrepancies: [],
        action: "grant_bki_consent",
        reason: "Данные БКИ доступны только после согласия клиента",
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

  private buildProfile(
    inn: string,
    source: EgrulRecord | null,
    account: Awaited<ReturnType<DemoDataStore["getAccount"]>> | undefined,
  ): CompanyProfile {
    return {
      inn,
      ogrn: source?.ogrn ?? "Не получен",
      name: source?.name ?? "Компания не подтверждена",
      legalForm: account?.company.form ?? "ooo",
      registeredAt: source?.registeredAt ?? account?.company.registeredAt ?? "Не получена",
      okved: source?.okved ?? account?.company.okved ?? "Не получен",
      region: account?.company.address.split(",")[0] ?? "Москва",
      address: account?.company.address ?? "Адрес будет подтверждён при проверке источника",
      director: account?.company.head ?? "Руководитель будет подтверждён при проверке источника",
    };
  }

  private egrulSnapshot(
    result: { value: EgrulRecord | null; checkedAt: string },
    unavailable: boolean,
    discrepancies: CompanyProfileResponse["sources"][number]["discrepancies"],
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
      unavailable,
      discrepancies,
    );
  }

  private fnsSnapshot(
    result: { value: FnsProfile | null; checkedAt: string },
    unavailable: boolean,
    discrepancies: CompanyProfileResponse["sources"][number]["discrepancies"],
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
    return this.snapshot("fns", result, facts, "Данные ФНС получены", unavailable, discrepancies);
  }

  private bkiSnapshot(
    result: { value: BkiReport | null; checkedAt: string | null },
    unavailable: boolean,
    discrepancies: CompanyProfileResponse["sources"][number]["discrepancies"],
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
    return this.snapshot("bki", result, facts, "Данные БКИ получены", unavailable, discrepancies);
  }

  private turnoverSnapshot(checkedAt: string): CompanySourceSnapshot {
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
      discrepancies: [],
      action: "none",
      reason: null,
      checkedAt,
    };
  }

  private fact(
    key: string,
    label: string,
    value: string,
    source: CompanySource,
    checkedAt: string | null,
  ): CompanyFact {
    return { key, label, value, source, state: "confirmed", checkedAt };
  }

  private snapshot<T>(
    source: CompanySource,
    result: { value: T | null; checkedAt: string | null },
    facts: CompanyFact[],
    summary: string,
    unavailable: boolean,
    discrepancies: CompanyProfileResponse["sources"][number]["discrepancies"],
  ): CompanySourceSnapshot {
    const sourceDiscrepancies = discrepancies.filter(
      (item) => item.firstSource === source || item.secondSource === source,
    );
    if (unavailable || !result.value) {
      return {
        source,
        state: "manual_check",
        summary: "Источник недоступен, нужна ручная проверка",
        facts: [],
        discrepancies: sourceDiscrepancies,
        action: unavailable ? "retry_source" : "manual_review",
        reason: unavailable ? "Источник не ответил, можно повторить проверку" : "Источник требует ручного подтверждения",
        checkedAt: result.checkedAt,
      };
    }
    return {
      source,
      state: sourceDiscrepancies.length > 0 ? "discrepancy" : "confirmed",
      summary: sourceDiscrepancies.length > 0 ? "Найдены расхождения в источниках" : summary,
      facts,
      discrepancies: sourceDiscrepancies,
      action: sourceDiscrepancies.length > 0 ? "manual_review" : "none",
      reason: sourceDiscrepancies[0]?.nextStep ?? null,
      checkedAt: result.checkedAt,
    };
  }

  private async checkedAt(inn: string, source: CompanySource): Promise<string> {
    await this.db.query(`
      create table if not exists company_source_checks (
        inn varchar(12) not null,
        source text not null,
        checked_at timestamptz not null,
        primary key (inn, source)
      )
    `);
    const rows = (await this.db.query(
      "select checked_at from company_source_checks where inn=$1 and source=$2",
      [inn, source],
    )) as Array<{ checked_at: Date | string }>;
    if (rows[0]?.checked_at) {
      return new Date(rows[0].checked_at).toISOString();
    }
    const checkedAt = new Date().toISOString();
    await this.db.query(
      "insert into company_source_checks(inn,source,checked_at) values($1,$2,$3) on conflict (inn,source) do nothing",
      [inn, source, checkedAt],
    );
    return checkedAt;
  }
}
