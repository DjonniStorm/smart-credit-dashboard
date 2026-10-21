import type {
  Application,
  ApplicationStage,
  CreditProductId,
  WaitingOn,
} from "@repo/contracts/application";

import { waitingOrder } from "@/entities/application";

export type SortKey = "waiting" | "amount" | "score" | "age";
export type SortDir = "asc" | "desc";

export interface QueueFilters {
  tab: WaitingOn | "all";
  search: string;
  stage: ApplicationStage | null;
  product: CreditProductId | null;
  /** id сотрудника, "none" без ответственного. */
  assignee: string | null;
  sort: SortKey;
  dir: SortDir;
}

export const defaultFilters: QueueFilters = {
  tab: "all",
  search: "",
  stage: null,
  product: null,
  assignee: null,
  sort: "waiting",
  dir: "asc",
};

function matches(app: Application, f: QueueFilters): boolean {
  if (f.tab !== "all" && app.waitingOn !== f.tab) return false;
  if (f.stage && app.stage !== f.stage) return false;
  if (f.product && app.request.productId !== f.product) return false;
  if (f.assignee === "none" && app.assigneeId) return false;
  if (f.assignee && f.assignee !== "none" && app.assigneeId !== f.assignee)
    return false;
  const q = f.search.trim().toLowerCase();
  if (!q) return true;
  return (
    app.applicant.inn.includes(q) ||
    app.number.includes(q) ||
    app.applicant.name.toLowerCase().includes(q)
  );
}

const waitingSince = (a: Application) => Date.parse(a.updatedAt);

function compare(a: Application, b: Application, key: SortKey): number {
  switch (key) {
    case "waiting":
      // Сначала ход за сотрудником, внутри группы дольше ждущие выше.
      return (
        waitingOrder[a.waitingOn] - waitingOrder[b.waitingOn] ||
        waitingSince(a) - waitingSince(b)
      );
    case "amount":
      return a.request.amount - b.request.amount;
    case "score":
      // Заявки без скоринга идут как балл -1.
      return (a.scoring?.score ?? -1) - (b.scoring?.score ?? -1);
    case "age":
      return waitingSince(b) - waitingSince(a);
  }
}

export function applyFilters(
  apps: Application[],
  f: QueueFilters,
): Application[] {
  const sign = f.dir === "asc" ? 1 : -1;
  return apps
    .filter((a) => matches(a, f))
    .sort((a, b) => sign * compare(a, b, f.sort));
}

export function countByTab(
  apps: Application[],
): Record<QueueFilters["tab"], number> {
  const counts = {
    all: apps.length,
    employee: 0,
    client: 0,
    system: 0,
    nobody: 0,
  };
  for (const a of apps) counts[a.waitingOn] += 1;
  return counts;
}
