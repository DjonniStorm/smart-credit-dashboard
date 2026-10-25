"use client";

import { Button, Group, Modal, Select, Stack, Textarea } from "@mantine/core";
import { IconCircleX } from "@tabler/icons-react";
import { useState } from "react";

import type { EmployeeAction, RejectReason } from "@repo/contracts/application";

import { rejectReasonLabel } from "@/shared/api/arm";

import { type DialogProps, ErrorLine } from "./shared";

export function RejectIcon() {
  return <IconCircleX size={16} color="var(--kk-danger)" aria-hidden />;
}

export function RejectDialog({
  opened,
  app,
  pending,
  error,
  onClose,
  onSubmit,
}: DialogProps & { onSubmit: (action: EmployeeAction) => void }) {
  const failed = app.decision?.rules.find((r) => r.outcome === "fail")?.id;
  const guess: RejectReason =
    failed === "company_active"
      ? "company_inactive"
      : failed === "bki_overdue"
        ? "bki_overdue"
        : failed === "score" || failed === "business_age"
          ? "low_score"
          : "other";
  const [reason, setReason] = useState<RejectReason>(guess);
  const [comment, setComment] = useState("");
  const [touched, setTouched] = useState(false);

  return (
    <Modal opened={opened} onClose={onClose} title="Отказать" size="md">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setTouched(true);
          if (!comment.trim()) return;
          onSubmit({ type: "reject", reason, comment: comment.trim() });
        }}
      >
        <Stack gap="md">
          <Select
            label="Причина"
            data={Object.entries(rejectReasonLabel).map(([value, label]) => ({
              value,
              label,
            }))}
            value={reason}
            onChange={(v) => v && setReason(v as RejectReason)}
            allowDeselect={false}
          />
          <Textarea
            label="Пояснение"
            description="Клиент увидит причину отказа, пишите без внутренних терминов"
            value={comment}
            onChange={(e) => setComment(e.currentTarget.value)}
            error={touched && !comment.trim() ? "Напишите пояснение" : null}
            autosize
            minRows={2}
          />
          <ErrorLine error={error} />
          <Group justify="flex-end" gap="xs">
            <Button variant="default" onClick={onClose}>
              Отмена
            </Button>
            <Button
              type="submit"
              variant="default"
              leftSection={<RejectIcon />}
              loading={pending}
            >
              Отказать
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
