"use client";

import { Button, Group, Modal, Stack, Text, Textarea } from "@mantine/core";
import { useState } from "react";

import { type DialogProps, ErrorLine } from "./shared";

export function HoldDialog({
  opened,
  pending,
  error,
  onClose,
  kind,
  onSubmit,
}: Pick<DialogProps, "opened" | "pending" | "error" | "onClose"> & {
  kind: "pause" | "block";
  onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const title =
    kind === "pause" ? "Поставить на паузу" : "Заблокировать заявку";
  return (
    <Modal opened={opened} onClose={onClose} title={title} size="sm">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (reason.trim()) onSubmit(reason.trim());
        }}
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Причина попадёт в аудит заявки. Бизнес-статус и история переходов
            сохраняются.
          </Text>
          <Textarea
            label="Причина"
            placeholder={
              kind === "pause"
                ? "Например, ждём уточнение от клиента"
                : "Например, требуется ручная проверка риска"
            }
            value={reason}
            onChange={(e) => setReason(e.currentTarget.value)}
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
              {title}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
