"use client";

import {
  type MantineColorScheme,
  SegmentedControl,
  useMantineColorScheme,
} from "@mantine/core";
import { type JSX } from "react";

export type ThemeSelectorLabels = {
  light: string;
  dark: string;
  auto: string;
};

type ThemeSelectorProps = {
  labels: ThemeSelectorLabels;
  /** id заголовка «Тема», чтобы aria-labelledby ссылался на него. */
  labelId: string;
};

/** Единый переключатель темы кабинета: светлая, тёмная, как в системе. */
export function ThemeSelector({
  labels,
  labelId,
}: ThemeSelectorProps): JSX.Element {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  return (
    <SegmentedControl
      aria-labelledby={labelId}
      value={colorScheme}
      onChange={(v) => setColorScheme(v as MantineColorScheme)}
      data={[
        { value: "light", label: labels.light },
        { value: "dark", label: labels.dark },
        { value: "auto", label: labels.auto },
      ]}
    />
  );
}
