"use client";

import { AppShell, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";

import { StateBlock } from "@repo/ui/state-block";

import { needsClient, useApplications } from "@/entities/application";
import { useSession } from "@/entities/session";
import { CabinetAlfi } from "@/features/alfi-assistant";
import { tx } from "@/shared/i18n";
import { QueryError } from "@/shared/ui/query-state";

import { CabinetHeader } from "./cabinet-header";
import { CabinetNav } from "./cabinet-nav";
import classes from "./cabinet-shell.module.css";

/** Счётчик у «Моих заявок»: заявки, где ход за клиентом. */
function Nav({ onNavigate }: { onNavigate: () => void }) {
  const apps = useApplications();
  const count = (apps.data ?? []).filter(needsClient).length;
  return <CabinetNav needsYou={count} onNavigate={onNavigate} />;
}

/** Каркас кабинета: шапка 52px, меню 220px, рабочая область, проверка входа. */
export function CabinetShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const session = useSession();
  const account = session.data;
  const [navOpened, nav] = useDisclosure(false);

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
        width: 220,
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
        />
      </AppShell.Header>
      <AppShell.Navbar p="xs">
        {account && <Nav onNavigate={nav.close} />}
      </AppShell.Navbar>
      <AppShell.Main>
        <div className={classes.content}>{body}</div>
        <Text size="xs" c="dimmed" className={classes.note}>
          {tx.demo.footer}
        </Text>
        {account && <CabinetAlfi />}
      </AppShell.Main>
    </AppShell>
  );
}
