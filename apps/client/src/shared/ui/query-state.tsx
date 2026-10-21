"use client";

import { Button, Group, Text } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
import type { ReactNode } from "react";

import { StateBlock } from "@repo/ui/state-block";

import { tx } from "@/shared/i18n";

/** Ошибка загрузки: что сломалось и кнопка повтора. */
export function QueryError({
  error,
  onRetry,
  title = tx.common.loadErrorTitle,
}: {
  error: unknown;
  onRetry: () => void;
  title?: string;
}) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    <StateBlock
      kind="error"
      title={title}
      action={
        <Button variant="default" onClick={onRetry}>
          {tx.common.retry}
        </Button>
      }
    >
      {tx.common.loadErrorText(message)}
    </StateBlock>
  );
}

/** Ошибка у поля или действия: иконка и текст, красный ошибки не путается с брендом. */
export function InlineError({ children }: { children: ReactNode }) {
  return (
    <Group
      gap={6}
      wrap="nowrap"
      align="flex-start"
      c="var(--kk-danger)"
      role="alert"
    >
      <IconAlertCircle
        size={18}
        stroke={1.75}
        aria-hidden
        style={{ flex: "none", marginTop: 2 }}
      />
      <Text size="sm" c="inherit">
        {children}
      </Text>
    </Group>
  );
}
