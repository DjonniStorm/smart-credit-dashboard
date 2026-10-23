import type {
  AttachedDocument,
  CreditPurpose,
  Financials,
} from "@repo/contracts/cabinet";

/** Черновик мастера заявки: живёт в localStorage до отправки. */
export interface ApplicationDraft {
  accountId: string;
  step: number;
  purpose: CreditPurpose;
  productId: string;
  amount: number | string;
  termMonths: number | string;
  comment: string;
  financials: Record<keyof Financials, number | string> | null;
  documents: AttachedDocument[];
  savedAt: string;
}

const KEY = "kk-application-draft-v1";

export function loadDraft(): ApplicationDraft | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ApplicationDraft) : null;
  } catch {
    return null;
  }
}

export function saveDraft(draft: ApplicationDraft) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(draft));
  } catch {
    // Без хранилища черновик живёт только на странице.
  }
}

export function clearDraft() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // нечего чистить
  }
}
