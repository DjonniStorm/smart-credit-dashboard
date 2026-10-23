"use client";

import { Button, Group, Modal, Stack, Text, Textarea } from "@mantine/core";
import { useState } from "react";

import type { DialogProps } from "./shared";
import { ErrorLine } from "./shared";

export function InterceptDialog({
  opened,
  pending,
  error,
  onClose,
  onSubmit,
}: Pick<DialogProps, "opened" | "pending" | "error" | "onClose"> & {
  onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Перехватить автоодобрение"
      size="sm"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (reason.trim()) {
            onSubmit(reason.trim());
          }
        }}
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Заявка вернётся в ручное рассмотрение. Причина сохранится в аудите.
          </Text>
          <Textarea
            label="Причина перехвата"
            placeholder="Например, нужна ручная проверка оборота"
            value={reason}
            onChange={(event) => setReason(event.currentTarget.value)}
            required
            autosize
            minRows={3}
          />
          <ErrorLine error={error} />
          <Group justify="flex-end" gap="xs">
            <Button variant="default" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" loading={pending}>
              Перехватить
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
