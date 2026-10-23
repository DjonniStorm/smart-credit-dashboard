import { cabinetText, i18n } from "@repo/i18n";
import type { CompanyProfileResponse } from "@repo/contracts/company-profile";

import { AlfiState } from "../../alfi-state";

export type CompanyPassportSource = CompanyProfileResponse["sources"][number];
export type CompanyPassportMode = "client" | "backoffice";
export type CompanyPassportDensity = "compact" | "full";

export const passportText = cabinetText(i18n.defaultLocale).companyPassport;
export const companySourceLabels = passportText.sourceLabels;
export const companySourceStateLabels = passportText.stateLabels;

export function formatCompanyDate(value: string | null): string {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleDateString("ru-RU");
}

export function isProblemSource(source: CompanyPassportSource): boolean {
  return ["discrepancy", "manual_check", "unavailable", "pending"].includes(
    source.state,
  );
}

export function getPassportState(
  sources: CompanyPassportSource[],
): CompanyPassportSource["state"] {
  if (sources.some((source) => source.state === "discrepancy")) {
    return "discrepancy";
  }
  if (sources.some((source) => ["manual_check", "unavailable"].includes(source.state))) {
    return "manual_check";
  }
  if (sources.some((source) => source.state === "pending")) {
    return "pending";
  }
  return "confirmed";
}

export function getAlfiHint(
  profile: CompanyProfileResponse,
  state: CompanyPassportSource["state"],
): { state: AlfiState; title: string; message: string } {
  if (state === "discrepancy") {
    return {
      state: AlfiState.Attention,
      title: passportText.alfi.discrepancyTitle,
      message: passportText.alfi.discrepancyMessage,
    };
  }
  if (state === "manual_check" || state === "unavailable") {
    return {
      state: AlfiState.Attention,
      title: passportText.alfi.manualCheckTitle,
      message: passportText.alfi.manualCheckMessage,
    };
  }
  if (profile.bkiConsent.status === "required") {
    return {
      state: AlfiState.NeedsAnswer,
      title: passportText.alfi.consentTitle,
      message: passportText.alfi.consentMessage,
    };
  }
  return {
    state: AlfiState.Success,
    title: passportText.alfi.readyTitle,
    message: passportText.alfi.readyMessage,
  };
}
