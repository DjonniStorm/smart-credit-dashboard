"use client";

import {
  Badge,
  Button,
  Group,
  Menu,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { IconChevronDown } from "@tabler/icons-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";

import { Message, i18n, t } from "@repo/i18n";
import { ColorSchemeToggle } from "@repo/ui/color-scheme-toggle";
import { StateBlock } from "@repo/ui/state-block";

import { useResetDemo } from "@/entities/application";
import {
  SignedInProvider,
  roleLabel,
  signOut,
  useCurrentEmployee,
} from "@/entities/employee";
import { armApiMode } from "@/shared/api/arm";
import { formatRub } from "@/shared/lib/money";

import classes from "./arm-shell.module.css";

const nav = [
  { href: "/", label: "Очередь заявок" },
  { href: "/journal", label: "Журнал действий" },
  { href: "/products", label: "Продукты и правила" },
];

/** Шапка АРМ и проверка входа. Без входа отправляет на /login. */
export function ArmShell({ children }: { children: ReactNode }) {
  const { id, employee, isLoading, error, retry } = useCurrentEmployee();
  const router = useRouter();
  const pathname = usePathname();
  const reset = useResetDemo();

  useEffect(() => {
    if (id === null || (!isLoading && !error && !employee)) {
      router.replace("/login");
    }
  }, [id, isLoading, error, employee, router]);

  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/" || pathname.startsWith("/applications")
      : pathname.startsWith(href);

  return (
    <>
      <header className={classes.header}>
        <div className={classes.inner}>
          <Text className={classes.brand}>
            {t(i18n.defaultLocale, Message.ArmTitle)}
          </Text>
          <nav className={classes.nav} aria-label="Разделы АРМ">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={classes.link}
                aria-current={isActive(n.href) ? "page" : undefined}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <Group gap="sm" wrap="nowrap">
            {armApiMode === "mock" && (
              <Badge
                visibleFrom="sm"
                variant="light"
                title="Данные заявок выдуманы и хранятся в этом браузере"
              >
                Синтетические данные
              </Badge>
            )}
            <ColorSchemeToggle />
            {employee && (
              <Menu position="bottom-end" withinPortal>
                <Menu.Target>
                  <UnstyledButton aria-label="Меню сотрудника">
                    <Group gap={6} wrap="nowrap">
                      <Stack gap={0} visibleFrom="sm">
                        <Text size="sm" fw={600} lh={1.2}>
                          {employee.name}
                        </Text>
                        <Text size="xs" c="dimmed" lh={1.2}>
                          {roleLabel[employee.role]}
                        </Text>
                      </Stack>
                      <Text hiddenFrom="sm" size="sm" fw={600}>
                        {employee.name}
                      </Text>
                      <IconChevronDown size={16} aria-hidden />
                    </Group>
                  </UnstyledButton>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Label>
                    Одобряет до {formatRub(employee.approvalLimit)}
                  </Menu.Label>
                  <Menu.Item
                    onClick={() => {
                      signOut();
                      router.replace("/login");
                    }}
                  >
                    Сменить учётную запись
                  </Menu.Item>
                  {armApiMode === "mock" && (
                    <Menu.Item onClick={() => reset.mutate()}>
                      Вернуть демо-данные к началу
                    </Menu.Item>
                  )}
                </Menu.Dropdown>
              </Menu>
            )}
          </Group>
        </div>
      </header>
      <main className={classes.main}>
        {error ? (
          <StateBlock
            kind="error"
            title="Не удалось проверить вход"
            action={
              <Button variant="default" onClick={retry}>
                Повторить
              </Button>
            }
          >
            {error.message}
          </StateBlock>
        ) : employee ? (
          <SignedInProvider employee={employee}>{children}</SignedInProvider>
        ) : (
          <StateBlock kind="loading" title="Проверяем вход" />
        )}
      </main>
    </>
  );
}
