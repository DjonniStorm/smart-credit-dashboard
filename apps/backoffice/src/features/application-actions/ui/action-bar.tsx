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
import {
  IconAlertCircle,
  IconCircleCheck,
  IconDotsVertical,
} from "@tabler/icons-react";
import { useState } from "react";

import type {
  Application,
  Employee,
  EmployeeAction,
} from "@repo/contracts/application";
import { backofficeText, i18n } from "@repo/i18n";

import { useApplicationAction } from "@/entities/application";
import type { ArmProduct } from "@/shared/api/arm";
import { formatRub } from "@/shared/lib/money";

import { type DialogKind, buildActionLayout } from "../model/action-items";
import { ActionDialogs } from "./action-dialogs";
import { showActionFeedback } from "./alfi-feedback";
import { RejectIcon } from "./dialogs";

/**
 * Действия по заявке одной строкой: красная кнопка следующего шага,
 * вторичная и меню с остальным. Каждое действие уходит в API, меняет заявку
 * и пишется в журнал.
 */
export function ActionBar({
  app,
  employee,
  employees,
  products,
}: {
  app: Application;
  employee: Employee;
  employees: Employee[];
  products: ArmProduct[];
}) {
  const [dialog, setDialog] = useState<DialogKind | null>(null);
  const mutation = useApplicationAction(app.id, employee.id);

  function run(action: EmployeeAction, done: string) {
    mutation.mutate(action, {
      onSuccess: () => {
        setDialog(null);
        showActionFeedback(action, done);
      },
    });
  }
  function open(next: DialogKind) {
    mutation.reset();
    setDialog(next);
  }

  const {
    canDecide,
    overLimit,
    clientReplied,
    primary,
    secondary,
    menu,
    hint,
  } = buildActionLayout({
    app,
    employee,
    employees,
    pendingType: mutation.isPending ? (mutation.variables?.type ?? null) : null,
    open,
    run,
  });

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
      {canDecide && clientReplied && (
        <Alert
          variant="light"
          color="green"
          icon={<IconCircleCheck size={18} aria-hidden />}
          p="xs"
        >
          <Text size="xs">
            {
              backofficeText(i18n.defaultLocale).application.decision
                .clientReplied
            }
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
      {mutation.error && !dialog && (
        <Text size="xs" c="var(--kk-danger)" role="alert">
          {mutation.error.message}
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
              leftSection={secondary.destructive ? <RejectIcon /> : undefined}
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
                {menu.map((item) => (
                  <Menu.Item
                    key={item.key}
                    leftSection={item.destructive ? <RejectIcon /> : undefined}
                    disabled={item.disabled}
                    onClick={item.run}
                  >
                    {item.label}
                    {item.disabled && " (выше лимита)"}
                  </Menu.Item>
                ))}
              </Menu.Dropdown>
            </Menu>
          )}
        </Group>
      )}

      <ActionDialogs
        dialog={dialog}
        app={app}
        employee={employee}
        employees={employees}
        products={products}
        pending={mutation.isPending}
        error={mutation.error}
        onClose={() => setDialog(null)}
        run={run}
      />
    </Stack>
  );
}
