"use client";

import { Button, Group, Modal, Stack, Text, Textarea } from "@mantine/core";
import { useState } from "react";

import { productLabel } from "@/entities/application";
import { formatRub } from "@/shared/lib/money";

import { type DialogProps, ErrorLine } from "./shared";

export function ApproveDialog({
  opened,
  app,
  pending,
  error,
  onClose,
  onSubmit,
}: DialogProps & { onSubmit: (comment: string) => void }) {
  const [comment, setComment] = useState("");
  const recommendedOther = app.decision?.recommendation !== "approve";
  return (
    <Modal opened={opened} onClose={onClose} title="Одобрить заявку" size="md">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(comment);
        }}
      >
        <Stack gap="md">
          <Text>
            {productLabel[app.request.productId]}:{" "}
            <Text span fw={600}>
              {formatRub(app.request.amount)}
            </Text>{" "}
            на {app.request.termMonths} мес., как просил клиент.
          </Text>
          {recommendedOther && app.decision && (
            <Text size="sm" c="dimmed">
              Система рекомендовала другое: {app.decision.explanation} Объясните
              решение в комментарии.
            </Text>
          )}
          <Textarea
            label="Комментарий"
            description="Попадёт в журнал заявки"
            value={comment}
            onChange={(e) => setComment(e.currentTarget.value)}
            required={recommendedOther}
            autosize
            minRows={2}
          />
          <ErrorLine error={error} />
          <Group justify="flex-end" gap="xs">
            <Button variant="default" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" loading={pending}>
              Одобрить
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
