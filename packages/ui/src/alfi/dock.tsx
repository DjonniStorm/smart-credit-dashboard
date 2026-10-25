"use client";

import { ActionIcon, Button, Group, Paper, Stack, Text } from "@mantine/core";
import { useLocalStorage } from "@mantine/hooks";
import { IconX } from "@tabler/icons-react";
import type { JSX } from "react";

import { Alfi } from "../alfi-character";
import type { AlfiState } from "../alfi-state";
import classes from "./dock.module.css";
import { showTarget } from "./show-target";

/** Куда ведёт подсказка: на другую страницу или к элементу текущей страницы. */
export type AlfiDockAction =
  { label: string; href: string } | { label: string; target: string };

export type AlfiDockHint = {
  state: AlfiState;
  title: string;
  message: string;
  action?: AlfiDockAction;
};

/** Подписи кнопок помощника, приходят из словаря приложения. */
export type AlfiDockLabels = {
  region: string;
  hide: string;
  show: string;
  fresh: (title: string) => string;
};

export type AlfiDockProps = {
  hint: AlfiDockHint;
  labels: AlfiDockLabels;
  /** Ключ localStorage, под которым запоминается, что Альфи скрыт. */
  storageKey: string;
  /** Переход по ссылке подсказки, обычно router.push приложения. */
  onNavigate: (href: string) => void;
};

/**
 * Альфи в правом нижнем углу: одна подсказка о следующем шаге и кнопка,
 * которая ведёт к нужному месту. Скрывается до маленькой кнопки.
 */
export function AlfiDock({
  hint,
  labels,
  storageKey,
  onNavigate,
}: AlfiDockProps): JSX.Element {
  const [hidden, setHidden] = useLocalStorage({
    key: storageKey,
    defaultValue: false,
    getInitialValueInEffect: true,
  });
  // Подсказка, которую пользователь видел перед тем, как скрыть Альфи.
  const [seenTitle, setSeenTitle] = useLocalStorage<string | null>({
    key: `${storageKey}:seen`,
    defaultValue: null,
    getInitialValueInEffect: true,
  });
  const fresh = hidden && seenTitle !== null && seenTitle !== hint.title;

  const hide = () => {
    setSeenTitle(hint.title);
    setHidden(true);
  };

  if (hidden) {
    return (
      <button
        type="button"
        className={classes.collapsed}
        data-fresh={fresh || undefined}
        aria-label={fresh ? labels.fresh(hint.title) : labels.show}
        onClick={() => setHidden(false)}
      >
        <Alfi state={hint.state} size={40} alt="" />
      </button>
    );
  }

  const action = hint.action;
  return (
    <Paper
      component="aside"
      aria-label={labels.region}
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
          {action && (
            <Button
              size="xs"
              variant="light"
              className={classes.action}
              onClick={() => {
                if ("href" in action) {
                  onNavigate(action.href);
                } else {
                  showTarget(action.target);
                }
              }}
            >
              {action.label}
            </Button>
          )}
        </Stack>
        <ActionIcon
          variant="subtle"
          color="gray"
          size="sm"
          aria-label={labels.hide}
          onClick={hide}
        >
          <IconX size={16} aria-hidden />
        </ActionIcon>
      </Group>
    </Paper>
  );
}
