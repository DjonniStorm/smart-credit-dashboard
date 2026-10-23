import type { CreditPurpose } from "@repo/contracts/product-catalog";
import { cabinetText, i18n } from "@repo/i18n";

const purposes = cabinetText(i18n.defaultLocale).purposes;

/** Подпись цели кредита, общая с кабинетом клиента. */
export function purposeLabel(purpose: CreditPurpose): string {
  return purposes[purpose].label;
}
