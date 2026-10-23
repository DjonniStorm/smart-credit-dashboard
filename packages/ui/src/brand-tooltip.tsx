"use client";

import { Tooltip } from "@mantine/core";
import type { ReactElement } from "react";

/** Подсказка у логотипа банка. Касание логотипа ведёт на главную, поэтому только наведение и фокус. */
export function BrandTooltip({
  label,
  children,
}: {
  label: string;
  children: ReactElement;
}) {
  return (
    <Tooltip
      label={label}
      multiline
      w={260}
      withArrow
      position="bottom-start"
      events={{ hover: true, focus: true, touch: false }}
    >
      {children}
    </Tooltip>
  );
}
