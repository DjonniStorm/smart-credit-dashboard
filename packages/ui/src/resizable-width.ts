"use client";

import { useLocalStorage } from "@mantine/hooks";
import { useCallback } from "react";

export type UseResizableWidthOptions = {
  /** Ключ localStorage, уникальный для приложения и сайдбара. */
  storageKey: string;
  defaultValue: number;
  min: number;
  max: number;
};

/**
 * Ширина колонки с сохранением в localStorage и клампингом мин/макс.
 * Используется общим разделителем SidebarResizer в АРМ и кабинете клиента.
 */
export function useResizableWidth({
  storageKey,
  defaultValue,
  min,
  max,
}: UseResizableWidthOptions) {
  const [stored, setStored] = useLocalStorage<number>({
    key: storageKey,
    defaultValue,
    deserialize: (value) => {
      const parsed = value === undefined ? NaN : Number(value);
      return Number.isFinite(parsed) ? parsed : defaultValue;
    },
  });
  const width = Math.min(max, Math.max(min, stored));

  const setWidth = useCallback(
    (next: number) => {
      setStored(Math.min(max, Math.max(min, next)));
    },
    [min, max, setStored],
  );

  return { width, setWidth };
}
