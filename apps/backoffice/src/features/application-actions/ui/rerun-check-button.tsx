"use client";

import { Button, Text } from "@mantine/core";
import { IconRefresh } from "@tabler/icons-react";

import type { CheckSource } from "@repo/contracts/application";

import { useApplicationAction } from "@/entities/application";

/** Повторный запрос в источник, который не ответил. */
export function RerunCheckButton({
  applicationId,
  employeeId,
  source,
}: {
  applicationId: string;
  employeeId: string;
  source: CheckSource;
}) {
  const mutation = useApplicationAction(applicationId, employeeId);
  return (
    <>
      <Button
        size="xs"
        variant="default"
        leftSection={<IconRefresh size={14} aria-hidden />}
        loading={mutation.isPending}
        onClick={() => mutation.mutate({ type: "rerun_check", source })}
        style={{ alignSelf: "flex-start" }}
      >
        Запросить повторно
      </Button>
      {mutation.error && (
        <Text size="sm" c="var(--kk-danger)" role="alert">
          {mutation.error.message}
        </Text>
      )}
    </>
  );
}
