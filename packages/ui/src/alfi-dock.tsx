"use client";

import { ActionIcon, Button, Group, Paper, Stack, Text } from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import { type JSX, useCallback, useState, useSyncExternalStore } from "react";

import { Alfi } from "./alfi-character";
import classes from "./alfi-dock.module.css";
import type { AlfiState } from "./alfi-state";

/** Куда ведёт подсказка: на другую страницу или к элементу текущей страницы. */
export type AlfiDockAction =
  { label: string; href: string } | { label: string; target: string };

export type AlfiDockHint = {
  state: AlfiState;
  title: string;
  message: string;
  action?: AlfiDockAction;
};

export type AlfiDockProps = {
  hint: AlfiDockHint;
  /** Ключ localStorage, под которым запоминается, что Альфи скрыт. */
  storageKey: string;
  /** Переход по ссылке подсказки, обычно router.push приложения. */
  onNavigate: (href: string) => void;
};

const HIGHLIGHT_MS = 1600;

/**
 * Альфи в правом нижнем углу: одна подсказка о следующем шаге и кнопка,
 * которая ведёт к нужному месту. Скрывается до маленькой кнопки.
 */
export function AlfiDock({
  hint,
  storageKey,
  onNavigate,
}: AlfiDockProps): JSX.Element {
  const [hidden, setHidden] = useStoredFlag(storageKey);
  // Подсказка, которую пользователь видел перед тем, как скрыть Альфи.
  const [seenTitle, setSeenTitle] = useState<string | null>(null);
  const fresh = hidden && seenTitle !== null && seenTitle !== hint.title;

  const hide = useCallback(() => {
    setSeenTitle(hint.title);
    setHidden(true);
  }, [hint.title, setHidden]);

  if (hidden) {
    return (
      <button
        type="button"
        className={classes.collapsed}
        data-fresh={fresh || undefined}
        aria-label={
          fresh
            ? `Новая подсказка Альфи: ${hint.title}`
            : "Показать подсказку Альфи"
        }
        onClick={() => setHidden(false)}
      >
        <Alfi state={hint.state} size={40} alt="" />
      </button>
    );
  }

  return (
    <Paper
      component="aside"
      aria-label="Подсказка Альфи"
      className={classes.dock}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          hide();
        }
      }}
    >
      <Group gap="sm" wrap="nowrap" align="flex-start">
        <Alfi state={hint.state} size={56} />
        <Stack gap={4} className={classes.body} aria-live="polite">
          <Text fw={600} size="sm">
            {hint.title}
          </Text>
          <Text size="sm">{hint.message}</Text>
          {hint.action && (
            <Button
              size="xs"
              variant="light"
              className={classes.action}
              onClick={() => runAction(hint.action!, onNavigate)}
            >
              {hint.action.label}
            </Button>
          )}
        </Stack>
        <ActionIcon
          variant="subtle"
          color="gray"
          size="sm"
          aria-label="Скрыть Альфи"
          onClick={hide}
        >
          <IconX size={16} aria-hidden />
        </ActionIcon>
      </Group>
    </Paper>
  );
}

function runAction(
  action: AlfiDockAction,
  onNavigate: (href: string) => void,
): void {
  if ("href" in action) {
    onNavigate(action.href);
    return;
  }
  const element = document.querySelector<HTMLElement>(
    `[data-alfi-target="${action.target}"]`,
  );
  if (!element) {
    return;
  }
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  element.scrollIntoView({
    behavior: reduced ? "auto" : "smooth",
    block: "center",
  });
  if (!element.hasAttribute("tabindex")) {
    element.setAttribute("tabindex", "-1");
  }
  element.focus({ preventScroll: true });
  element.setAttribute("data-alfi-highlight", "");
  window.setTimeout(() => {
    element.removeAttribute("data-alfi-highlight");
  }, HIGHLIGHT_MS);
}

/** Флаги в localStorage. Без доступа к хранилищу живут только в памяти. */
class StoredFlags {
  private readonly memory = new Map<string, boolean>();
  private readonly listeners = new Set<() => void>();

  read(key: string): boolean {
    try {
      return window.localStorage.getItem(key) === "1";
    } catch {
      return this.memory.get(key) ?? false;
    }
  }

  write(key: string, value: boolean): void {
    this.memory.set(key, value);
    try {
      window.localStorage.setItem(key, value ? "1" : "0");
    } catch {
      // Приватный режим: скрытие действует до перезагрузки страницы.
    }
    this.listeners.forEach((listener) => {
      listener();
    });
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    window.addEventListener("storage", listener);
    return () => {
      this.listeners.delete(listener);
      window.removeEventListener("storage", listener);
    };
  };
}

const storedFlags = new StoredFlags();

function useStoredFlag(key: string): [boolean, (value: boolean) => void] {
  const value = useSyncExternalStore(
    storedFlags.subscribe,
    () => storedFlags.read(key),
    () => false,
  );
  const update = useCallback(
    (next: boolean) => {
      storedFlags.write(key, next);
    },
    [key],
  );
  return [value, update];
}
