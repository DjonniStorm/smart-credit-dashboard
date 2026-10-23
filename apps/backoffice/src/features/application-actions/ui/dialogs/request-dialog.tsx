"use client";

import {
  Button,
  Checkbox,
  Group,
  Modal,
  Stack,
  TextInput,
  Textarea,
} from "@mantine/core";
import { useState } from "react";

import type { EmployeeAction } from "@repo/contracts/application";

import { type DialogProps, ErrorLine } from "./shared";

const DOCUMENTS = [
  "Справка об отсутствии налоговой задолженности",
  "Выписка по расчётному счёту за 6 месяцев",
  "Бухгалтерская отчётность за последний год",
  "Договор с покупателем под цель кредита",
];

export function RequestDialog({
  opened,
  app,
  pending,
  error,
  onClose,
  onSubmit,
}: DialogProps & { onSubmit: (action: EmployeeAction) => void }) {
  const suggested = app.decision?.rules.some(
    (r) => r.id === "tax_debt" && r.outcome !== "pass",
  )
    ? [DOCUMENTS[0]!]
    : [];
  const [items, setItems] = useState<string[]>(suggested);
  const [other, setOther] = useState("");
  const [comment, setComment] = useState("");
  const [touched, setTouched] = useState(false);
  const all = [...items, ...(other.trim() ? [other.trim()] : [])];

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Запросить у клиента"
      size="md"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setTouched(true);
          if (all.length === 0) return;
          onSubmit({
            type: "request_info",
            items: all,
            comment: comment.trim(),
          });
        }}
      >
        <Stack gap="md">
          <Checkbox.Group
            label="Что нужно от клиента"
            value={items}
            onChange={setItems}
            error={
              touched && all.length === 0 ? "Выберите хотя бы один пункт" : null
            }
          >
            <Stack gap="xs" mt="xs">
              {DOCUMENTS.map((d) => (
                <Checkbox key={d} value={d} label={d} />
              ))}
            </Stack>
          </Checkbox.Group>
          <TextInput
            label="Другое"
            placeholder="Например, пояснение по выручке"
            value={other}
            onChange={(e) => setOther(e.currentTarget.value)}
          />
          <Textarea
            label="Комментарий для клиента"
            value={comment}
            onChange={(e) => setComment(e.currentTarget.value)}
            autosize
            minRows={2}
          />
          <ErrorLine error={error} />
          <Group justify="flex-end" gap="xs">
            <Button variant="default" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" loading={pending}>
              Отправить запрос
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
