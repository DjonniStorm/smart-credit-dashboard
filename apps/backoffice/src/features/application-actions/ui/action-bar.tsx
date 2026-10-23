"use client";

import { Button, Group, Stack, Text } from "@mantine/core";
import { useState } from "react";

import type { Application, Employee, EmployeeAction } from "@repo/contracts/application";

import type { ArmProduct } from "@/shared/api/arm";
import { useApplicationAction } from "@/entities/application";
import {
  ApproveDialog,
  CommentDialog,
  CounterDialog,
  RejectDialog,
  RequestDialog,
} from "./dialogs";

type DialogKind = "request" | "approve" | "counter" | "reject" | "comment";

export function ActionBar({
  app,
  employee,
  products,
}: {
  app: Application;
  employee: Employee;
  products: ArmProduct[];
}) {
  const [dialog, setDialog] = useState<DialogKind | null>(null);
  const mutation = useApplicationAction(app.id, employee.id);
  const close = () => {
    setDialog(null);
    mutation.reset();
  };
  const submit = (action: EmployeeAction) => {
    mutation.mutate(action, { onSuccess: close });
  };

  return (
    <Stack gap="xs">
      <Group gap="xs" wrap="wrap">
        <Button size="xs" onClick={() => setDialog("request")}>
          Запросить данные
        </Button>
        <Button size="xs" variant="light" onClick={() => setDialog("approve")}>
          Одобрить
        </Button>
        <Button size="xs" variant="light" onClick={() => setDialog("counter")}>
          Встречное предложение
        </Button>
        <Button size="xs" color="red" variant="light" onClick={() => setDialog("reject")}>
          Отказать
        </Button>
        <Button size="xs" variant="default" onClick={() => setDialog("comment")}>
          Комментарий
        </Button>
      </Group>
      <Text size="xs" c="dimmed">
        Команды проходят серверную проверку статуса и сохраняются в аудите.
      </Text>
      {dialog === "request" && (
        <RequestDialog
          opened
          app={app}
          pending={mutation.isPending}
          error={mutation.error}
          onClose={close}
          onSubmit={submit}
        />
      )}
      {dialog === "approve" && (
        <ApproveDialog
          opened
          app={app}
          pending={mutation.isPending}
          error={mutation.error}
          onClose={close}
          onSubmit={(comment) => submit({ type: "approve", comment })}
        />
      )}
      {dialog === "counter" && (
        <CounterDialog
          opened
          app={app}
          products={products}
          pending={mutation.isPending}
          error={mutation.error}
          onClose={close}
          onSubmit={submit}
        />
      )}
      {dialog === "reject" && (
        <RejectDialog
          opened
          app={app}
          pending={mutation.isPending}
          error={mutation.error}
          onClose={close}
          onSubmit={submit}
        />
      )}
      {dialog === "comment" && (
        <CommentDialog
          opened
          pending={mutation.isPending}
          error={mutation.error}
          onClose={close}
          onSubmit={submit}
        />
      )}
      <Text size="xs" c="dimmed">
        Номер заявки: {app.number}
      </Text>
    </Stack>
  );
}
