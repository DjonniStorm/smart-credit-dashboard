"use client";

import {
  ActionIcon,
  useComputedColorScheme,
  useMantineColorScheme,
} from "@mantine/core";
import { IconMoon, IconSun } from "@tabler/icons-react";
import { type JSX } from "react";

export function ColorSchemeToggle(): JSX.Element {
  const { setColorScheme } = useMantineColorScheme();
  // На сервере схема неизвестна: значение уточняется после монтирования, без ошибки гидрации.
  const scheme = useComputedColorScheme("light", {
    getInitialValueInEffect: true,
  });
  const Icon = scheme === "dark" ? IconSun : IconMoon;

  return (
    <ActionIcon
      variant="default"
      size="lg"
      aria-label="Сменить тему"
      title="Сменить тему"
      onClick={() => setColorScheme(scheme === "dark" ? "light" : "dark")}
    >
      <Icon size={20} stroke={1.75} aria-hidden />
    </ActionIcon>
  );
}
