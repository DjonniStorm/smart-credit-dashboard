"use client";

import {
  ActionIcon,
  Alert,
  Button,
  Group,
  Menu,
  Stack,
  Text,
} from "@mantine/core";
import { IconAlertCircle, IconDotsVertical } from "@tabler/icons-react";
import { type ReactNode, useState } from "react";

import type {
  Application,
  ClientResponse,
  CreditProduct,
  Employee,
  EmployeeAction,
} from "@repo/contracts/application";
import { alfi } from "@repo/ui/alfi";

import {
  clientResponseLabel,
  useApplicationAction,
  useClientSimulation,
} from "@/entities/application";
import { useEmployees } from "@/entities/employee";
import { armApiMode } from "@/shared/api/arm";
import { formatRub } from "@/shared/lib/money";

import {
  ApproveDialog,
  CounterDialog,
  HoldDialog,
  RejectDialog,
  RejectIcon,
  RequestDialog,
} from "./dialogs";

type Dialog = "approve" | "counter" | "request" | "reject" | "pause" | "block";

const recommendedDialog = {
  approve: "approve",
  counter_offer: "counter",
  request_info: "request",
  reject: "reject",
} as const;

const dialogLabel: Record<Dialog, string> = {
  approve: "Одобрить",
  counter: "Другие условия",
  request: "Запросить документы",
  reject: "Отказать",
  pause: "Поставить на паузу",
  block: "Заблокировать",
};

/** Ответ клиента, которого ждёт заявка. В демо его делает сотрудник. */
const expectedResponse: Partial<Record<Application["status"], ClientResponse>> =
  {
    needs_client: "documents_sent",
    counter_offer: "offer_accepted",
    approved: "contract_signed",
  };

interface Item {
  key: string;
  label: string;
  run: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
}

/**
 * Действия по заявке одной строкой: красная кнопка следующего шага,
 * вторичная и меню с остальным. Каждое действие меняет статус и пишется в журнал.
 */
export function ActionBar({
  app,
  employee,
  products,
}: {
  app: Application;
  employee: Employee;
  products: CreditProduct[];
}) {
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const mutation = useApplicationAction(app.id, employee.id);
  const simulation = useClientSimulation(app.id);
  const employees = useEmployees();

  function run(action: EmployeeAction, done: string) {
    mutation.mutate(action, {
      onSuccess: () => {
        setDialog(null);
        showAlfiActionFeedback(action, done);
      },
    });
  }
  function open(next: Dialog) {
    mutation.reset();
    setDialog(next);
  }

  const canDecide =
    !app.hold && app.stage === "decision" && app.waitingOn === "employee";
  const overLimit = app.request.amount > employee.approvalLimit;
  const lead = employees.data?.find(
    (e) => e.role === "lead" && e.id !== employee.id,
  );
  const assigning = mutation.isPending && mutation.variables?.type === "assign";
  const holding =
    mutation.isPending &&
    ["pause", "block", "resume"].includes(mutation.variables?.type ?? "");

  const take: Item | null =
    !app.hold && app.assigneeId !== employee.id && app.waitingOn !== "nobody"
      ? {
          key: "take",
          label: "Взять в работу",
          loading: assigning,
          run: () =>
            run(
              { type: "assign", assigneeId: employee.id },
              "Заявка у вас в работе",
            ),
        }
      : null;

  const toLead: Item | null =
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
  const decisions: Item[] = canDecide
    ? [
        recommended,
        ...(["approve", "counter", "request", "reject"] as const).filter(
          (k) => k !== recommended,
        ),
      ].map((k) => ({
        key: k,
        label: dialogLabel[k],
        disabled: k === "approve" && overLimit,
        icon: k === "reject" ? <RejectIcon /> : undefined,
        run: () => open(k),
      }))
    : [];

  const response = expectedResponse[app.status];
  const demo: Item | null =
    armApiMode === "mock" && !app.hold && response && app.waitingOn === "client"
      ? {
          key: "demo",
          label: `Демо: ${clientResponseLabel[response].toLowerCase()}`,
          loading: simulation.isPending,
          run: () => simulation.mutate(response),
        }
      : null;

  const transfers: Item[] =
    app.hold || app.waitingOn === "nobody"
      ? []
      : (employees.data ?? [])
          .filter((e) => e.id !== app.assigneeId && e.id !== lead?.id)
          .map((e) => ({
            key: `to-${e.id}`,
            label: `Передать: ${e.name}`,
            run: () =>
              run({ type: "assign", assigneeId: e.id }, `Передано: ${e.name}`),
          }));

  const canHold =
    !app.hold &&
    app.status !== "rejected" &&
    app.status !== "disbursed" &&
    app.waitingOn !== "nobody";
  const holdActions: Item[] = app.hold
    ? [
        {
          key: "resume",
          label: "Вернуть в работу",
          loading: holding,
          run: () =>
            run(
              { type: "resume", comment: "" },
              "Заявка возвращена в работу",
            ),
        },
      ]
    : canHold
      ? [
          { key: "pause", label: dialogLabel.pause, run: () => open("pause") },
          { key: "block", label: dialogLabel.block, run: () => open("block") },
        ]
      : [];

  // Красная только у рекомендованного решения, и никогда у отказа.
  // Если одобрить нельзя по лимиту, следующий шаг: передать руководителю.
  const firstDecision = decisions[0];
  let primary: Item | null = null;
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

  // Пока ход за клиентом, процесс двигает только его ответ: он идёт вторым.
  const rest = [demo, take, toLead, ...decisions, ...transfers, ...holdActions].filter(
    (i): i is Item => i !== null && i.key !== primary?.key,
  );
  const secondary = rest.find((i) => !i.disabled) ?? null;
  const menu = rest.filter((i) => i !== secondary);

  const hint = canDecide
    ? null
    : app.hold
      ? "Заявка приостановлена. Верните её в работу, чтобы продолжить обработку."
    : app.waitingOn === "system"
      ? "Проверки идут автоматически. Решение станет доступно после рекомендации."
      : app.waitingOn === "client"
        ? "Ход за клиентом. Заявка вернётся к вам, когда он ответит."
        : app.waitingOn === "nobody"
          ? "Решение принято, действий не требуется."
          : "Сначала повторите запрос в источник, который не ответил.";

  const error = mutation.error ?? simulation.error;

  return (
    <Stack gap="xs">
      {canDecide && overLimit && (
        <Alert
          variant="light"
          color="amber"
          icon={<IconAlertCircle size={18} aria-hidden />}
          p="xs"
        >
          <Text size="xs">
            Одобрить {formatRub(app.request.amount)} может руководитель: ваш
            лимит {formatRub(employee.approvalLimit)}.
          </Text>
        </Alert>
      )}
      {hint && (
        <Text size="xs" c="dimmed">
          {hint}
        </Text>
      )}
      {app.hold && (
        <Alert
          color={app.hold.state === "blocked" ? "red" : "yellow"}
          variant="light"
          p="xs"
        >
          <Text size="xs" fw={600}>
            {app.hold.state === "blocked"
              ? "Заявка заблокирована"
              : "Заявка на паузе"}
          </Text>
          <Text size="xs">{app.hold.reason}</Text>
        </Alert>
      )}
      {error && !dialog && (
        <Text size="xs" c="var(--kk-danger)" role="alert">
          {error.message}
        </Text>
      )}
      {(primary || secondary || menu.length > 0) && (
        <Group gap="xs" wrap="wrap">
          {primary && (
            <Button
              size="sm"
              loading={primary.loading}
              onClick={primary.run}
              style={{ flex: "1 1 auto" }}
            >
              {primary.label}
            </Button>
          )}
          {secondary && (
            <Button
              size="sm"
              variant="default"
              loading={secondary.loading}
              leftSection={secondary.icon}
              onClick={secondary.run}
              style={{ flex: "1 1 auto" }}
            >
              {secondary.label}
            </Button>
          )}
          {menu.length > 0 && (
            <Menu position="top-end" withinPortal>
              <Menu.Target>
                <ActionIcon
                  variant="default"
                  size={36}
                  ml="auto"
                  aria-label="Другие действия"
                >
                  <IconDotsVertical size={18} stroke={1.5} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                {menu.map((i) => (
                  <Menu.Item
                    key={i.key}
                    leftSection={i.icon}
                    disabled={i.disabled}
                    onClick={i.run}
                  >
                    {i.label}
                    {i.disabled && " (выше лимита)"}
                  </Menu.Item>
                ))}
              </Menu.Dropdown>
            </Menu>
          )}
        </Group>
      )}

      {dialog === "approve" && (
        <ApproveDialog
          opened
          app={app}
          pending={mutation.isPending}
          error={mutation.error}
          onClose={() => setDialog(null)}
          onSubmit={(comment) =>
            run(
              { type: "approve", comment },
              "Заявка одобрена, клиент получит договор",
            )
          }
        />
      )}
      {dialog === "counter" && (
        <CounterDialog
          opened
          app={app}
          products={products}
          pending={mutation.isPending}
          error={mutation.error}
          onClose={() => setDialog(null)}
          onSubmit={(action) =>
            run(action, "Встречное предложение отправлено клиенту")
          }
        />
      )}
      {dialog === "request" && (
        <RequestDialog
          opened
          app={app}
          pending={mutation.isPending}
          error={mutation.error}
          onClose={() => setDialog(null)}
          onSubmit={(action) => run(action, "Запрос отправлен клиенту")}
        />
      )}
      {dialog === "reject" && (
        <RejectDialog
          opened
          app={app}
          pending={mutation.isPending}
          error={mutation.error}
          onClose={() => setDialog(null)}
          onSubmit={(action) => run(action, "Отказ зафиксирован")}
        />
      )}
      {(dialog === "pause" || dialog === "block") && (
        <HoldDialog
          opened
          kind={dialog}
          pending={mutation.isPending}
          error={mutation.error}
          onClose={() => setDialog(null)}
          onSubmit={(reason) =>
            run(
              { type: dialog, reason },
              dialog === "pause"
                ? "Заявка поставлена на паузу"
                : "Заявка заблокирована",
            )
          }
        />
      )}
    </Stack>
  );
}

function showAlfiActionFeedback(action: EmployeeAction, message: string): void {
  const options = { raw: action.type, withBorder: true };

  switch (action.type) {
    case "request_info": {
      alfi.showNeedsInfo(message, options);
      break;
    }
    case "approve":
    case "counter_offer": {
      alfi.showOfferReady(message, options);
      break;
    }
    case "reject": {
      alfi.showDocumentRejected(message, options);
      break;
    }
    case "assign":
    case "rerun_check": {
      alfi.showSuccess(message, options);
      break;
    }
    case "pause":
    case "block":
    case "resume": {
      alfi.showSuccess(message, options);
      break;
    }
  }
}
