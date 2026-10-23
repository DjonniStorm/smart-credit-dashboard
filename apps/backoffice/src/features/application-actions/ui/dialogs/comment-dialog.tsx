"use client";

import { Button, Group, Modal, Select, Stack, Textarea } from "@mantine/core";
import { useState } from "react";

import type {
  ApplicationComment,
  EmployeeAction,
} from "@repo/contracts/application";

import { type DialogProps, ErrorLine } from "./shared";

export function CommentDialog({
  opened,
  pending,
  error,
  onClose,
  onSubmit,
}: Pick<DialogProps, "opened" | "pending" | "error" | "onClose"> & {
  onSubmit: (action: EmployeeAction) => void;
}) {
  const [visibility, setVisibility] =
    useState<ApplicationComment["visibility"]>("internal");
  const [body, setBody] = useState("");
  const [touched, setTouched] = useState(false);
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Добавить комментарий"
      size="md"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setTouched(true);
          if (!body.trim()) return;
          onSubmit({ type: "comment", visibility, body: body.trim() });
        }}
      >
        <Stack gap="md">
          <Select
            label="Видимость"
            description="Определяет, кто увидит запись в истории заявки"
            value={visibility}
            onChange={(value) =>
              value && setVisibility(value as ApplicationComment["visibility"])
            }
            data={[
              { value: "internal", label: "Внутренний комментарий" },
              { value: "client", label: "Комментарий клиенту" },
              { value: "handoff", label: "Комментарий для передачи" },
            ]}
            allowDeselect={false}
          />
          <Textarea
            label="Текст"
            placeholder="Зафиксируйте важное наблюдение или следующий шаг"
            value={body}
            onChange={(e) => setBody(e.currentTarget.value)}
            error={touched && !body.trim() ? "Напишите комментарий" : null}
            required
            autosize
            minRows={4}
            maxLength={2000}
          />
          <ErrorLine error={error} />
          <Group justify="flex-end" gap="xs">
            <Button variant="default" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" loading={pending}>
              Добавить
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
