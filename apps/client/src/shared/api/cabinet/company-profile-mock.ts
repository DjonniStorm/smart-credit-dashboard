import type { DemoAccount } from "@repo/contracts/cabinet";
import type {
  CompanyProfileResponse,
  CompanySourceSnapshot,
} from "@repo/contracts/company-profile";

import { accounts } from "./fixtures";
import { ApiError } from "./types";

const CONSENTS_KEY = "kk-company-profile-consents-v1";

function sourceSnapshot(
  source: CompanySourceSnapshot["source"],
  summary: string,
  facts: CompanySourceSnapshot["facts"],
): CompanySourceSnapshot {
  return {
    source,
    state: "confirmed",
    summary,
    facts,
    checkedAt: new Date().toISOString(),
  };
}

function accountFor(inn: string): DemoAccount {
  const account = accounts.find((item) => item.company.inn === inn);
  if (!account) {
    throw new ApiError("Компания с таким ИНН не найдена", 404);
  }
  return account;
}

function consentFor(inn: string): string | null {
  try {
    const consents = JSON.parse(
      window.localStorage.getItem(CONSENTS_KEY) ?? "{}",
    ) as Record<string, string>;
    return consents[inn] ?? null;
  } catch {
    return null;
  }
}

function saveConsent(inn: string, grantedAt: string): void {
  try {
    const consents = JSON.parse(
      window.localStorage.getItem(CONSENTS_KEY) ?? "{}",
    ) as Record<string, string>;
    consents[inn] = grantedAt;
    window.localStorage.setItem(CONSENTS_KEY, JSON.stringify(consents));
  } catch {
    // Приватный режим не должен ломать просмотр профиля.
  }
}

export async function getMockCompanyProfile(
  inn: string,
): Promise<CompanyProfileResponse> {
  const account = accountFor(inn);
  const grantedAt = consentFor(inn);
  const checkedAt = new Date().toISOString();
  const sources: CompanySourceSnapshot[] = [
    sourceSnapshot("egrul", "Данные ЕГРЮЛ/ЕГРИП подтверждены", [
      {
        key: "status",
        label: "Статус",
        value: "Действующее",
        source: "egrul",
        state: "confirmed",
        checkedAt,
      },
    ]),
    sourceSnapshot("fns", "Данные ФНС получены", [
      {
        key: "tax_debt",
        label: "Налоговая задолженность",
        value: "0 ₽",
        source: "fns",
        state: "confirmed",
        checkedAt,
      },
    ]),
    sourceSnapshot("bank_turnover", "Обороты по счёту доступны банку", [
      {
        key: "avg_monthly_turnover",
        label: "Средний месячный оборот",
        value: `${account.knownFinancials.avgMonthlyTurnover} ₽`,
        source: "bank_turnover",
        state: "confirmed",
        checkedAt,
      },
    ]),
  ];

  sources.push(
    grantedAt
      ? sourceSnapshot("bki", "Данные БКИ получены", [
          {
            key: "overdue_days",
            label: "Просрочка",
            value: "0 дней",
            source: "bki",
            state: "confirmed",
            checkedAt,
          },
        ])
      : {
          source: "bki",
          state: "pending",
          summary: "Нужно согласие на запрос данных БКИ",
          facts: [],
          checkedAt: null,
        },
  );

  return {
    profile: {
      inn: account.company.inn,
      ogrn: account.company.ogrn,
      name: account.company.name,
      legalForm: account.company.form,
      registeredAt: account.company.registeredAt,
      okved: account.company.okved,
      region: "Москва",
      address: account.company.address,
      director: account.company.head,
    },
    sources,
    bkiConsent: {
      status: grantedAt ? "granted" : "required",
      grantedAt,
    },
  };
}

export async function grantMockBkiConsent(
  inn: string,
): Promise<CompanyProfileResponse> {
  accountFor(inn);
  saveConsent(inn, new Date().toISOString());
  return getMockCompanyProfile(inn);
}
