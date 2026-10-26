"use client";

import {
  ActionIcon,
  AppShell,
  Burger,
  Button,
  Group,
  Text,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
} from "@tabler/icons-react";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";

import { useResizableWidth } from "@repo/ui/resizable-width";
import { SidebarResizer } from "@repo/ui/sidebar-resizer";
import { StateBlock } from "@repo/ui/state-block";
import { useSidebarCollapse } from "@repo/ui/use-sidebar-collapse";

import { SignedInProvider, useCurrentEmployee } from "@/entities/employee";
import { ArmAlfi } from "@/features/alfi-assistant";

import classes from "./arm-shell.module.css";
import { BrandMark } from "./brand-mark";
import { HeaderSearch } from "./header-search";
import { InboxBell } from "./inbox-bell";
import { ProfileMenu } from "./profile-menu";
import { RailNav } from "./rail-nav";

const NAV_MIN = 200;
const NAV_MAX = 360;
const NAV_DEFAULT = 220;
const NAV_COLLAPSED = 64;

/** Каркас АРМ: шапка 52px, меню 220px, рабочая область. Без входа отправляет на /login. */
export function ArmShell({ children }: { children: ReactNode }) {
  const { id, employee, isLoading, error, retry } = useCurrentEmployee();
  const router = useRouter();
  const pathname = usePathname();
  const [opened, { toggle, close }] = useDisclosure();
  const { collapsed: navCollapsed, toggle: toggleNav } = useSidebarCollapse({
    storageKey: "arm-nav-collapsed",
  });
  const { width: navWidth, setWidth: setNavWidth } = useResizableWidth({
    storageKey: "arm-nav-width",
    defaultValue: NAV_DEFAULT,
    min: NAV_MIN,
    max: NAV_MAX,
  });

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
        width: navCollapsed ? NAV_COLLAPSED : navWidth,
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
          <ActionIcon
            visibleFrom="sm"
            type="button"
            variant="subtle"
            color="gray"
            size={36}
            onClick={toggleNav}
            aria-label={navCollapsed ? "Развернуть меню" : "Свернуть меню"}
            aria-expanded={!navCollapsed}
          >
            {navCollapsed ? (
              <IconLayoutSidebarLeftExpand size={18} stroke={1.5} />
            ) : (
              <IconLayoutSidebarLeftCollapse size={18} stroke={1.5} />
            )}
          </ActionIcon>
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
          <RailNav collapsed={navCollapsed} />
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

      {employee && !navCollapsed && (
        <SidebarResizer
          width={navWidth}
          min={NAV_MIN}
          max={NAV_MAX}
          onChange={setNavWidth}
          label="Изменить ширину меню"
        />
      )}
    </AppShell>
  );
}
