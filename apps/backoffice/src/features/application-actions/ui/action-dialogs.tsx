"use client";

import type {
  Application,
  Employee,
  EmployeeAction,
} from "@repo/contracts/application";

import type { ArmProduct } from "@/shared/api/arm";

import type { DialogKind } from "../model/action-items";
import {
  ApproveDialog,
  CancelDialog,
  CommentDialog,
  CounterDialog,
  HandoffDialog,
  HoldDialog,
  RejectDialog,
  RequestDialog,
} from "./dialogs";

interface Props {
  dialog: DialogKind | null;
  app: Application;
  employee: Employee;
  employees: Employee[];
  products: ArmProduct[];
  pending: boolean;
  error: Error | null;
  onClose: () => void;
  run: (action: EmployeeAction, done: string) => void;
}

/** Открытый диалог действия. Формы живут в dialogs/, здесь только выбор по виду. */
export function ActionDialogs({
  dialog,
  app,
  employee,
  employees,
  products,
  pending,
  error,
  onClose,
  run,
}: Props) {
  const common = { opened: true, pending, error, onClose };
  switch (dialog) {
    case "approve":
      return (
        <ApproveDialog
          {...common}
          app={app}
          onSubmit={(comment) =>
            run(
              { type: "approve", comment },
              "Заявка одобрена, клиент получит договор",
            )
          }
        />
      );
    case "counter":
      return (
        <CounterDialog
          {...common}
          app={app}
          products={products}
          onSubmit={(action) =>
            run(action, "Встречное предложение отправлено клиенту")
          }
        />
      );
    case "request":
      return (
        <RequestDialog
          {...common}
          app={app}
          onSubmit={(action) => run(action, "Запрос отправлен клиенту")}
        />
      );
    case "reject":
      return (
        <RejectDialog
          {...common}
          app={app}
          onSubmit={(action) => run(action, "Отказ зафиксирован")}
        />
      );
    case "pause":
    case "block":
      return (
        <HoldDialog
          {...common}
          kind={dialog}
          onSubmit={(reason) =>
            run(
              { type: dialog, reason },
              dialog === "pause"
                ? "Заявка поставлена на паузу"
                : "Заявка заблокирована",
            )
          }
        />
      );
    case "comment":
      return (
        <CommentDialog
          {...common}
          onSubmit={(action) => run(action, "Комментарий добавлен в историю")}
        />
      );
    case "handoff":
      return (
        <HandoffDialog
          {...common}
          employees={employees.filter((e) => e.id !== employee.id)}
          onSubmit={(action) => run(action, "Заявка передана с резюме")}
        />
      );
    case "cancel":
      return (
        <CancelDialog
          {...common}
          onSubmit={(action) => run(action, "Заявка отменена")}
        />
      );
    default:
      return null;
  }
}
