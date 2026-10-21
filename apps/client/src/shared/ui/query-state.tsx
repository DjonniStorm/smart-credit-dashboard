"use client";

import { Button } from "@mantine/core";

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
