"use client";

import { Button, Group, Modal, Stack, Text, Textarea } from "@mantine/core";
import { useState } from "react";

import type { EmployeeAction } from "@repo/contracts/application";
import { backofficeText, i18n } from "@repo/i18n";

import { type DialogProps, ErrorLine } from "./shared";

const copy = backofficeText(i18n.defaultLocale).urgent;

/** Отказ в запросе срочности: причина обязательна и уходит в историю и клиенту. */
export function DeclineUrgentDialog({
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
    <Modal
      opened={opened}
      onClose={onClose}
      title={copy.declineTitle}
      size="sm"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (reason.trim())
            onSubmit({ type: "decline_urgent", reason: reason.trim() });
        }}
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            {copy.declineHint}
          </Text>
          <Textarea
            label={copy.declineReason}
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
              {copy.declineSubmit}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
