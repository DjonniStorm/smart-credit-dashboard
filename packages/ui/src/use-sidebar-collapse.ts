"use client";

import { useLocalStorage } from "@mantine/hooks";
import { useCallback, useEffect } from "react";

export type UseSidebarCollapseOptions = {
  /** Ключ localStorage, уникальный для приложения и сайдбара. */
  storageKey: string;
  /** Отключить горячую клавишу Ctrl+B, если она не нужна. */
  hotkey?: boolean;
};

/**
 * Сворачивание левого меню в узкую полосу: состояние в localStorage,
 * Ctrl+B в фазе перехвата (игнор Alt/Shift и полей ввода) и toggle.
 * Используется в АРМ и кабинете клиента.
 */
export function useSidebarCollapse({
  storageKey,
  hotkey = true,
}: UseSidebarCollapseOptions) {
  const [collapsed, setCollapsed] = useLocalStorage({
    key: storageKey,
    defaultValue: false,
  });

  useEffect(() => {
    if (!hotkey) return;
    function collapseOnKey(e: globalThis.KeyboardEvent) {
      if (
        !(e.ctrlKey || e.metaKey) ||
        e.altKey ||
        e.shiftKey ||
        e.key.toLowerCase() !== "b"
      ) {
        return;
      }
      const target = e.target as HTMLElement;
      if (
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) ||
        target.isContentEditable
      ) {
        return;
      }
      e.preventDefault();
      setCollapsed((value) => !value);
    }
    // Фаза перехвата: срабатывает, даже если другой обработчик остановит
    // всплытие (порталы, оверлеи).
    window.addEventListener("keydown", collapseOnKey, true);
    return () => window.removeEventListener("keydown", collapseOnKey, true);
  }, [hotkey, setCollapsed]);

  const toggle = useCallback(() => {
    setCollapsed((value) => !value);
  }, [setCollapsed]);

  return { collapsed, toggle, setCollapsed };
}
