"use client";

import { Button, Stack, Text } from "@mantine/core";

import type { Application, ClientResponse } from "@repo/contracts/application";

import {
  clientResponseLabel,
  useClientSimulation,
} from "@/entities/application";
import { armApiMode } from "@/shared/api/arm";

const expected: Partial<Record<Application["status"], ClientResponse>> = {
  needs_client: "documents_sent",
  counter_offer: "offer_accepted",
  approved: "contract_signed",
};

/**
 * Ответ клиента без кабинета клиента: мок живёт в браузере сотрудника,
 * поэтому ход клиента в демо делает сам сотрудник. В HTTP-режиме блока нет.
 */
export function ClientSimulation({ app }: { app: Application }) {
  const mutation = useClientSimulation(app.id);
  const response = expected[app.status];
  if (armApiMode !== "mock" || !response || app.waitingOn !== "client") {
    return null;
  }
  return (
    <Stack
      gap="xs"
      p="md"
      style={{
        border: "1px dashed var(--mantine-color-default-border)",
        borderRadius: "var(--mantine-radius-md)",
      }}
    >
      <Text size="sm" fw={600}>
        Демо: ход клиента
      </Text>
      <Text size="sm" c="dimmed">
        В настоящем процессе клиент отвечает в своём кабинете. Здесь его ответ
        можно смоделировать.
      </Text>
      <Button
        variant="default"
        size="xs"
        loading={mutation.isPending}
        onClick={() => mutation.mutate(response)}
        style={{ alignSelf: "flex-start" }}
      >
        {clientResponseLabel[response]}
      </Button>
      {mutation.error && (
        <Text size="sm" c="var(--kk-danger)" role="alert">
          {mutation.error.message}
        </Text>
      )}
    </Stack>
  );
}
