import dayjs from "dayjs";

import type {
  Application,
  ApplicationStage,
  CreditProductId,
} from "@repo/contracts/application";

import { type QueueGroup, queueGroup } from "@/entities/application";

export type QueueTab = QueueGroup | "all";
export type SortKey = "number" | "amount" | "created";
export type SortDir = "asc" | "desc";
export type AmountRange = "small" | "mid" | "large";

export const amountRangeLabel: Record<AmountRange, string> = {
  small: "До 1 млн ₽",
  mid: "От 1 до 5 млн ₽",
  large: "Больше 5 млн ₽",
};

const amountBounds: Record<AmountRange, [number, number]> = {
  small: [0, 1_000_000],
  mid: [1_000_000, 5_000_000],
  large: [5_000_000, Infinity],
};

/** Фильтры строки над таблицей. Вкладка живёт в адресе, поэтому отдельно. */
export interface QueueFilters {
  search: string;
  product: CreditProductId | null;
  amount: AmountRange | null;
  stage: ApplicationStage | null;
  /** id сотрудника, "none" без ответственного. */
  assignee: string | null;
  /** Дата подачи, YYYY-MM-DD, обе границы включительно. */
  period: [string | null, string | null];
  sort: SortKey;
  dir: SortDir;
}

export const defaultFilters: QueueFilters = {
  search: "",
  product: null,
  amount: null,
  stage: null,
  assignee: null,
  period: [null, null],
  sort: "number",
  dir: "desc",
};

export function isFiltered(f: QueueFilters): boolean {
  return Boolean(
    f.search.trim() ||
    f.product ||
    f.amount ||
    f.stage ||
    f.assignee ||
    f.period[0] ||
    f.period[1],
  );
}

/** Подходит ли заявка под фильтры, без учёта вкладки. */
function matches(app: Application, f: QueueFilters): boolean {
  if (f.stage && app.stage !== f.stage) return false;
  if (f.product && app.request.productId !== f.product) return false;
  if (f.amount) {
    const [min, max] = amountBounds[f.amount];
    if (app.request.amount < min || app.request.amount >= max) return false;
  }
  if (f.assignee === "none" && app.assigneeId) return false;
  if (f.assignee && f.assignee !== "none" && app.assigneeId !== f.assignee)
    return false;
  const day = dayjs(app.createdAt).format("YYYY-MM-DD");
  if (f.period[0] && day < f.period[0]) return false;
  if (f.period[1] && day > f.period[1]) return false;
  const q = f.search.trim().toLowerCase();
  if (!q) return true;
  return (
    app.applicant.inn.includes(q) ||
    app.number.includes(q) ||
    app.applicant.name.toLowerCase().includes(q)
  );
}

function compare(a: Application, b: Application, key: SortKey): number {
  switch (key) {
    case "number":
      return Number(a.number) - Number(b.number);
    case "amount":
      return a.request.amount - b.request.amount;
    case "created":
      return Date.parse(a.createdAt) - Date.parse(b.createdAt);
  }
}

/** Заявки под фильтрами: для счётчиков вкладок. */
export function filterApps(
  apps: Application[],
  f: QueueFilters,
): Application[] {
  return apps.filter((a) => matches(a, f));
}

export function applyFilters(
  apps: Application[],
  f: QueueFilters,
  tab: QueueTab,
): Application[] {
  const sign = f.dir === "asc" ? 1 : -1;
  return filterApps(apps, f)
    .filter((a) => tab === "all" || queueGroup(a) === tab)
    .sort((a, b) => sign * compare(a, b, f.sort));
}
