"use client";

import { Button, Group, Modal, Stack, Text, Textarea } from "@mantine/core";
import { useState } from "react";

import type { EmployeeAction } from "@repo/contracts/application";

import { type DialogProps, ErrorLine } from "./shared";

export function CancelDialog({
  opened,
  pending,
  error,
  onClose,
  onSubmit,
}: Pick<DialogProps, "opened" | "pending" | "error" | "onClose"> & {
  onSubmit: (action: EmployeeAction) => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <Modal opened={opened} onClose={onClose} title="Отменить заявку" size="sm">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (reason.trim())
            onSubmit({ type: "cancel", reason: reason.trim() });
        }}
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Отмена завершит обработку заявки и попадёт в аудит.
          </Text>
          <Textarea
            label="Причина отмены"
            value={reason}
            onChange={(e) => setReason(e.currentTarget.value)}
            required
            autosize
            minRows={3}
          />
          <ErrorLine error={error} />
          <Group justify="flex-end" gap="xs">
            <Button variant="default" onClick={onClose}>
              Назад
            </Button>
            <Button type="submit" color="red" loading={pending}>
              Отменить заявку
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
