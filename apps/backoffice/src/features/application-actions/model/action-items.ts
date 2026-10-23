import type {
  Application,
  Employee,
  EmployeeAction,
} from "@repo/contracts/application";

export type DialogKind =
  | "approve"
  | "counter"
  | "request"
  | "reject"
  | "pause"
  | "block"
  | "comment"
  | "handoff"
  | "cancel";

export interface ActionItem {
  key: string;
  label: string;
  run: () => void;
  disabled?: boolean;
  loading?: boolean;
  /** Отказ рисуется с предупреждающей иконкой и никогда не бывает главным. */
  destructive?: boolean;
}

export const dialogLabel: Record<DialogKind, string> = {
  approve: "Одобрить",
  counter: "Другие условия",
  request: "Запросить документы",
  reject: "Отказать",
  pause: "Поставить на паузу",
  block: "Заблокировать",
  comment: "Добавить комментарий",
  handoff: "Передать с резюме",
  cancel: "Отменить заявку",
};

const recommendedDialog = {
  approve: "approve",
  counter_offer: "counter",
  request_info: "request",
  manual_review: "request",
  reject: "reject",
} as const;

interface BuildInput {
  app: Application;
  employee: Employee;
  employees: Employee[];
  pendingType: EmployeeAction["type"] | null;
  open: (dialog: DialogKind) => void;
  run: (action: EmployeeAction, done: string) => void;
}

export interface ActionLayout {
  canDecide: boolean;
  overLimit: boolean;
  primary: ActionItem | null;
  secondary: ActionItem | null;
  menu: ActionItem[];
  hint: string | null;
}

/**
 * Какие кнопки показывать. Правила зеркалят state machine api: решение доступно,
 * когда заявка ждёт сотрудника, пауза оставляет только «Вернуть в работу».
 */
export function buildActionLayout(input: BuildInput): ActionLayout {
  const { app, employee, employees, pendingType, open, run } = input;
  const closed = app.waitingOn === "nobody";
  const canDecide =
    !app.hold && app.stage === "decision" && app.waitingOn === "employee";
  const overLimit = app.request.amount > employee.approvalLimit;
  const lead = employees.find((e) => e.role === "lead" && e.id !== employee.id);

  const take: ActionItem | null =
    !app.hold && app.assigneeId !== employee.id && !closed
      ? {
          key: "take",
          label: "Взять в работу",
          loading: pendingType === "assign",
          run: () =>
            run(
              { type: "assign", assigneeId: employee.id },
              "Заявка у вас в работе",
            ),
        }
      : null;

  const toLead: ActionItem | null =
    canDecide && overLimit && lead
      ? {
          key: "lead",
          label: "Передать руководителю",
          run: () =>
            run(
              { type: "assign", assigneeId: lead.id },
              `Передано: ${lead.name}`,
            ),
        }
      : null;

  const recommended =
    recommendedDialog[app.decision?.recommendation ?? "approve"];
  const decisions: ActionItem[] = canDecide
    ? [
        recommended,
        ...(["approve", "counter", "request", "reject"] as const).filter(
          (k) => k !== recommended,
        ),
      ].map((k) => ({
        key: k,
        label: dialogLabel[k],
        disabled: k === "approve" && overLimit,
        destructive: k === "reject",
        run: () => open(k),
      }))
    : [];

  const transfers: ActionItem[] =
    app.hold || closed
      ? []
      : employees
          .filter((e) => e.id !== app.assigneeId && e.id !== lead?.id)
          .map((e) => ({
            key: `to-${e.id}`,
            label: `Передать: ${e.name}`,
            run: () =>
              run({ type: "assign", assigneeId: e.id }, `Передано: ${e.name}`),
          }));

  const holdActions: ActionItem[] = app.hold
    ? [
        {
          key: "resume",
          label: "Вернуть в работу",
          loading: pendingType === "resume",
          run: () =>
            run({ type: "resume", comment: "" }, "Заявка возвращена в работу"),
        },
      ]
    : closed
      ? []
      : [
          { key: "pause", label: dialogLabel.pause, run: () => open("pause") },
          { key: "block", label: dialogLabel.block, run: () => open("block") },
        ];

  const contextActions: ActionItem[] =
    app.hold || closed
      ? []
      : [
          {
            key: "comment",
            label: dialogLabel.comment,
            run: () => open("comment"),
          },
          {
            key: "handoff",
            label: dialogLabel.handoff,
            run: () => open("handoff"),
          },
          {
            key: "cancel",
            label: dialogLabel.cancel,
            run: () => open("cancel"),
          },
          {
            key: "urgent",
            label: app.urgent
              ? "Снять срочный режим"
              : "Включить срочный режим",
            run: () =>
              run(
                {
                  type: "set_urgent",
                  enabled: !app.urgent,
                  reason: app.urgent ? "" : "Приоритетная обработка",
                },
                app.urgent
                  ? "Срочный режим снят"
                  : "Заявка отмечена как срочная",
              ),
          },
        ];

  // Красная только у рекомендованного решения и никогда у отказа.
  // Если одобрить нельзя по лимиту, следующий шаг: передать руководителю.
  const firstDecision = decisions[0];
  let primary: ActionItem | null = null;
  if (
    firstDecision &&
    firstDecision.key !== "reject" &&
    !firstDecision.disabled
  ) {
    primary = firstDecision;
  } else if (toLead) {
    primary = toLead;
  } else if (take && app.waitingOn === "employee") {
    primary = take;
  }

  const rest = [
    take,
    toLead,
    ...decisions,
    ...transfers,
    ...holdActions,
    ...contextActions,
  ].filter((i): i is ActionItem => i !== null && i.key !== primary?.key);
  const secondary = rest.find((i) => !i.disabled) ?? null;

  return {
    canDecide,
    overLimit,
    primary,
    secondary,
    menu: rest.filter((i) => i !== secondary),
    hint: hintFor(app, canDecide),
  };
}

function hintFor(app: Application, canDecide: boolean): string | null {
  if (canDecide) {
    return null;
  }
  if (app.hold) {
    return "Заявка приостановлена. Верните её в работу, чтобы продолжить обработку.";
  }
  switch (app.waitingOn) {
    case "system":
      return "Проверки идут автоматически. Решение станет доступно после рекомендации.";
    case "client":
      return "Ход за клиентом. Заявка вернётся к вам, когда он ответит.";
    case "nobody":
      return "Решение принято, действий не требуется.";
    default:
      return "Сначала повторите запрос в источник, который не ответил.";
  }
}
