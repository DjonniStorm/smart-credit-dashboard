"use client";

import { MantineProvider } from "@mantine/core";
import { MotionConfig } from "motion/react";
import { type JSX, type ReactNode } from "react";
import { t } from "./motion";
import { compactTheme, cssVariablesResolver, theme } from "./theme";

/**
 * Тема Mantine и настройки Motion для приложения.
 * comfortable: кабинет клиента, compact: АРМ сотрудника.
 */
export function UiProvider({
  children,
  density = "comfortable",
}: {
  children: ReactNode;
  density?: "comfortable" | "compact";
}): JSX.Element {
  return (
    <MantineProvider
      theme={density === "compact" ? compactTheme : theme}
      cssVariablesResolver={cssVariablesResolver}
      defaultColorScheme="light"
    >
      <MotionConfig reducedMotion="user" transition={t.base}>
        {children}
      </MotionConfig>
    </MantineProvider>
  );
}
