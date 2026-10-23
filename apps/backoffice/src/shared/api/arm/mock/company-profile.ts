import type { Application, CheckState } from "@repo/contracts/application";
import type {
  CompanyFact,
  CompanyProfileResponse,
  CompanySource,
  CompanySourceSnapshot,
} from "@repo/contracts/company-profile";

const sourceState: Record<CheckState, CompanySourceSnapshot["state"]> = {
  pending: "pending",
  passed: "confirmed",
  warning: "discrepancy",
  failed: "manual_check",
  unavailable: "manual_check",
};

function snapshotFor(
  app: Application,
  source: CompanySource,
): CompanySourceSnapshot {
  const check = app.checks.find((item) => item.source === source);
  const state = check ? sourceState[check.state] : "pending";
  const checkedAt = check?.respondedAt ?? null;
  const facts: CompanyFact[] = (check?.facts ?? []).map((fact) => ({
    key: `${source}-${fact.label}`,
    label: fact.label,
    value: fact.value,
    source,
    state,
    checkedAt,
  }));

  return {
    source,
    state,
    summary: check?.summary ?? "Проверка ещё не запускалась",
    facts,
    checkedAt,
  };
}

export function companyProfileForApplication(
  app: Application,
): CompanyProfileResponse {
  const bki = app.checks.find((item) => item.source === "bki");
  const bkiGranted = bki?.state === "passed";
  const sources: CompanySourceSnapshot[] = [
    snapshotFor(app, "egrul"),
    snapshotFor(app, "fns"),
    {
      source: "bank_turnover",
      state: "confirmed",
      summary: "Обороты переданы из банковского счёта",
      facts: [
        {
          key: "annual_revenue",
          label: "Выручка за 12 месяцев",
          value: `${app.applicant.annualRevenue} ₽`,
          source: "bank_turnover",
          state: "confirmed",
          checkedAt: app.updatedAt,
        },
      ],
      checkedAt: app.updatedAt,
    },
  ];

  sources.push(
    bkiGranted
      ? snapshotFor(app, "bki")
      : {
          source: "bki",
          state: "pending",
          summary: "БКИ доступно после согласия клиента",
          facts: [],
          checkedAt: null,
        },
  );

  return {
    profile: {
      inn: app.applicant.inn,
      ogrn: app.applicant.ogrn,
      name: app.applicant.name,
      legalForm: app.applicant.legalForm,
      registeredAt: app.applicant.registeredAt,
      okved: app.applicant.okved,
      region: app.applicant.region,
      address: "Адрес проверяется по источникам",
      director: app.applicant.director,
    },
    sources,
    bkiConsent: {
      status: bkiGranted ? "granted" : "required",
      grantedAt: bkiGranted ? app.updatedAt : null,
    },
  };
}
