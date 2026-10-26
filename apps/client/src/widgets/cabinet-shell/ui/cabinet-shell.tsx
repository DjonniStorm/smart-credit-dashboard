"use client";

import { AppShell } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";

import { useResizableWidth } from "@repo/ui/resizable-width";
import { SidebarResizer } from "@repo/ui/sidebar-resizer";
import { StateBlock } from "@repo/ui/state-block";
import { useSidebarCollapse } from "@repo/ui/use-sidebar-collapse";

import { needsClient, useApplications } from "@/entities/application";
import { useSession } from "@/entities/session";
import { CabinetAlfi } from "@/features/alfi-assistant";
import { tx } from "@/shared/i18n";
import { QueryError } from "@/shared/ui/query-state";

import { CabinetHeader } from "./cabinet-header";
import { CabinetNav } from "./cabinet-nav";
import classes from "./cabinet-shell.module.css";

const NAV_COLLAPSED = 64;

/** Счётчик у «Моих заявок»: заявки, где ход за клиентом. */
function Nav({
  onNavigate,
  collapsed,
}: {
  onNavigate: () => void;
  collapsed: boolean;
}) {
  const apps = useApplications();
  const count = (apps.data ?? []).filter(needsClient).length;
  return (
    <CabinetNav
      needsYou={count}
      onNavigate={onNavigate}
      collapsed={collapsed}
    />
  );
}

/** Каркас кабинета: шапка 52px, меню 220px, рабочая область, проверка входа. */
export function CabinetShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const session = useSession();
  const account = session.data;
  const [navOpened, nav] = useDisclosure(false);
  const { width: navWidth, setWidth: setNavWidth } = useResizableWidth({
    storageKey: "cabinet-nav-width",
    defaultValue: 220,
    min: 200,
    max: 360,
  });
  const { collapsed: navCollapsed, toggle: toggleNav } = useSidebarCollapse({
    storageKey: "cabinet-nav-collapsed",
  });

  useEffect(() => {
    if (session.isSuccess && !account) router.replace("/login");
  }, [session.isSuccess, account, router]);

  let body: ReactNode;
  if (session.isError) {
    body = (
      <QueryError error={session.error} onRetry={() => session.refetch()} />
    );
  } else if (!account) {
    body = <StateBlock kind="loading" title={tx.session.checking} />;
  } else {
    body = children;
  }

  return (
    <AppShell
      header={{ height: 52 }}
      navbar={{
        width: navCollapsed ? NAV_COLLAPSED : navWidth,
        breakpoint: "sm",
        collapsed: { mobile: !navOpened },
      }}
      padding={0}
      classNames={{
        header: classes.header,
        navbar: classes.navbar,
        main: classes.main,
      }}
    >
      <AppShell.Header>
        <CabinetHeader
          account={account}
          navOpened={navOpened}
          onToggleNav={nav.toggle}
          navCollapsed={navCollapsed}
          onToggleCollapsed={toggleNav}
        />
      </AppShell.Header>
      <AppShell.Navbar p="xs">
        {account && <Nav onNavigate={nav.close} collapsed={navCollapsed} />}
      </AppShell.Navbar>
      <AppShell.Main>
        <div className={classes.content}>{body}</div>
        {account && <CabinetAlfi />}
      </AppShell.Main>

      {account && !navCollapsed && (
        <SidebarResizer
          width={navWidth}
          min={200}
          max={360}
          onChange={setNavWidth}
          label="Изменить ширину меню"
        />
      )}
    </AppShell>
  );
}
