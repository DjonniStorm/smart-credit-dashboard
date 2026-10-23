"use client";

import { Tooltip } from "@mantine/core";
import type { ReactElement } from "react";

/** История названия банка. Показывается при наведении и фокусе на логотип. */
export const brandStory = "Альфи-Банк назван в честь Альфи.";

export function BrandTooltip({ children }: { children: ReactElement }) {
  return (
    <Tooltip
      label={brandStory}
      multiline
      w={260}
      withArrow
      position="bottom-start"
      events={{ hover: true, focus: true, touch: true }}
    >
      {children}
    </Tooltip>
  );
}
