"use client";

import { AppShell, Burger, Button, Group, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";

import { StateBlock } from "@repo/ui/state-block";

import { SignedInProvider, useCurrentEmployee } from "@/entities/employee";
import { ArmAlfi } from "@/features/alfi-assistant";

import classes from "./arm-shell.module.css";
import { BrandMark } from "./brand-mark";
import { HeaderSearch } from "./header-search";
import { InboxBell } from "./inbox-bell";
import { ProfileMenu } from "./profile-menu";
import { RailNav } from "./rail-nav";

/** Каркас АРМ: шапка 52px, меню 220px, рабочая область. Без входа отправляет на /login. */
export function ArmShell({ children }: { children: ReactNode }) {
  const { id, employee, isLoading, error, retry } = useCurrentEmployee();
  const router = useRouter();
  const pathname = usePathname();
  const [opened, { toggle, close }] = useDisclosure();

  useEffect(() => {
    if (id === null || (!isLoading && !error && !employee)) {
      router.replace("/login");
    }
  }, [id, isLoading, error, employee, router]);

  // На телефоне меню закрывается после перехода.
  useEffect(close, [pathname, close]);

  let content: ReactNode;
  if (error) {
    content = (
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
    );
  } else if (!employee) {
    content = <StateBlock kind="loading" title="Проверяем вход" />;
  }

  return (
    <AppShell
      header={{ height: 52 }}
      navbar={{
        width: 220,
        breakpoint: "sm",
        collapsed: { mobile: !opened },
      }}
      classNames={{
        header: classes.header,
        navbar: classes.navbar,
        main: classes.main,
      }}
    >
      <AppShell.Header>
        <Group h="100%" px="md" gap="md" wrap="nowrap">
          <Burger
            opened={opened}
            onClick={toggle}
            hiddenFrom="sm"
            size="sm"
            aria-label={opened ? "Закрыть меню" : "Открыть меню"}
          />
          <BrandMark />
          <div className={classes.search}>{employee && <HeaderSearch />}</div>
          {employee && (
            <Group gap="xs" wrap="nowrap" ml="auto">
              <InboxBell employee={employee} />
              <ProfileMenu employee={employee} />
            </Group>
          )}
        </Group>
      </AppShell.Header>

      <AppShell.Navbar>
        {employee ? (
          <RailNav />
        ) : (
          <Text size="sm" c="dimmed" p="md">
            Меню появится после входа
          </Text>
        )}
      </AppShell.Navbar>

      <AppShell.Main>
        {employee && !error ? (
          <SignedInProvider employee={employee}>
            {children}
            <ArmAlfi employeeId={employee.id} />
          </SignedInProvider>
        ) : (
          <div className={classes.page}>{content}</div>
        )}
      </AppShell.Main>
    </AppShell>
  );
}
