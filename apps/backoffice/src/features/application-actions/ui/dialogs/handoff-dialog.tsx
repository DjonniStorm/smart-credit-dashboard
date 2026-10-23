"use client";

import { Button, Group, Modal, Select, Stack, Textarea } from "@mantine/core";
import { useState } from "react";

import type { Employee, EmployeeAction } from "@repo/contracts/application";

import { type DialogProps, ErrorLine } from "./shared";

export function HandoffDialog({
  opened,
  employees,
  pending,
  error,
  onClose,
  onSubmit,
}: Pick<DialogProps, "opened" | "pending" | "error" | "onClose"> & {
  employees: Employee[];
  onSubmit: (action: EmployeeAction) => void;
}) {
  const [assigneeId, setAssigneeId] = useState<string | null>(
    employees[0]?.id ?? null,
  );
  const [summary, setSummary] = useState("");
  const [facts, setFacts] = useState("");
  const [questions, setQuestions] = useState("");
  const [requested, setRequested] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [touched, setTouched] = useState(false);
  const lines = (value: string) =>
    value
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  return (
    <Modal opened={opened} onClose={onClose} title="Передать заявку" size="lg">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setTouched(true);
          if (!assigneeId || !summary.trim() || !nextStep.trim()) return;
          onSubmit({
            type: "handoff",
            assigneeId,
            summary: summary.trim(),
            verifiedFacts: lines(facts),
            openQuestions: lines(questions),
            requestedItems: lines(requested),
            nextStep: nextStep.trim(),
          });
        }}
      >
        <Stack gap="md">
          <Select
            label="Кому передать"
            value={assigneeId}
            onChange={setAssigneeId}
            data={employees.map((e) => ({
              value: e.id,
              label: `${e.name} · ${e.role}`,
            }))}
            allowDeselect={false}
            searchable
          />
          <Textarea
            label="Резюме для коллеги"
            value={summary}
            onChange={(e) => setSummary(e.currentTarget.value)}
            error={touched && !summary.trim() ? "Добавьте резюме" : null}
            required
            autosize
            minRows={3}
          />
          <Group grow align="flex-start">
            <Textarea
              label="Проверенные факты"
              description="Одна запись на строку"
              value={facts}
              onChange={(e) => setFacts(e.currentTarget.value)}
              autosize
              minRows={3}
            />
            <Textarea
              label="Открытые вопросы"
              description="Одна запись на строку"
              value={questions}
              onChange={(e) => setQuestions(e.currentTarget.value)}
              autosize
              minRows={3}
            />
          </Group>
          <Textarea
            label="Что запросить"
            description="Одна запись на строку"
            value={requested}
            onChange={(e) => setRequested(e.currentTarget.value)}
            autosize
            minRows={2}
          />
          <Textarea
            label="Следующий шаг"
            value={nextStep}
            onChange={(e) => setNextStep(e.currentTarget.value)}
            error={touched && !nextStep.trim() ? "Опишите следующий шаг" : null}
            required
            autosize
            minRows={2}
          />
          <ErrorLine error={error} />
          <Group justify="flex-end" gap="xs">
            <Button variant="default" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" loading={pending}>
              Передать
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
