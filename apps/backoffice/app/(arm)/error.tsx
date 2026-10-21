"use client";

import { Button } from "@mantine/core";

import { Message, i18n, t } from "@repo/i18n";
import { StateBlock } from "@repo/ui/state-block";

export default function ArmError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <StateBlock
      kind="error"
      title="Страница не открылась"
      action={
        <Button variant="default" onClick={reset}>
          {t(i18n.defaultLocale, Message.Retry)}
        </Button>
      }
    >
      {error.message}
    </StateBlock>
  );
}
