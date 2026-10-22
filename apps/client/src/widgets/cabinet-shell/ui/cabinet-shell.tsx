"use client";

import {
  Anchor,
  Box,
  Button,
  Container,
  Group,
  Stack,
  Text,
} from "@mantine/core";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";

import { ColorSchemeToggle } from "@repo/ui/color-scheme-toggle";
import { alfi, AlfiOperation } from "@repo/ui/alfi";
import { StateBlock } from "@repo/ui/state-block";

import { useSession, useSignOut } from "@/entities/session";
import { isMockApi, resetMockState } from "@/shared/api/cabinet";
import { tx } from "@/shared/i18n";
import { QueryError } from "@/shared/ui/query-state";

import classes from "./cabinet-shell.module.css";

const nav = [
  {
    href: "/",
    label: tx.nav.applications,
    active: (p: string) => p === "/" || p.startsWith("/applications"),
  },
  {
    href: "/products",
    label: tx.nav.products,
    active: (p: string) => p.startsWith("/products"),
  },
];

/** Каркас кабинета: шапка, навигация, проверка входа, демо-подвал. */
export function CabinetShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const session = useSession();
  const signOut = useSignOut();
  const account = session.data;

  useEffect(() => {
    if (session.isSuccess && !account) router.replace("/login");
  }, [session.isSuccess, account, router]);

  function reset() {
    resetMockState();
    queryClient.clear();
    alfi.show({
      operation: AlfiOperation.ActionCompleted,
      message: tx.demo.resetDone,
      raw: "demo_reset_completed",
    });
    router.replace("/login");
  }

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
    <div className={classes.page}>
      <header className={classes.header}>
        <Container size="lg" className={classes.headerInner}>
          <Anchor
            component={Link}
            href="/"
            className={classes.brand}
            underline="never"
          >
            {tx.brand}
          </Anchor>
          <nav aria-label={tx.nav.main} className={classes.nav}>
            {nav.map((item) => {
              const active = item.active(pathname);
              return (
                <Anchor
                  key={item.href}
                  component={Link}
                  href={item.href}
                  className={classes.navLink}
                  data-active={active || undefined}
                  aria-current={active ? "page" : undefined}
                  underline="never"
                >
                  {item.label}
                </Anchor>
              );
            })}
          </nav>
          <Group gap="sm" wrap="nowrap" className={classes.account}>
            {account && (
              <Stack gap={0} visibleFrom="md" align="flex-end">
                <Text size="sm" fw={500} lineClamp={1}>
                  {account.company.name}
                </Text>
                <Text size="xs" c="dimmed">
                  {account.person}
                </Text>
              </Stack>
            )}
            {account && (
              <Button
                variant="default"
                size="sm"
                loading={signOut.isPending}
                onClick={() =>
                  signOut.mutate(undefined, {
                    onSuccess: () => router.replace("/login"),
                  })
                }
              >
                {tx.nav.signOut}
              </Button>
            )}
            <ColorSchemeToggle />
          </Group>
        </Container>
      </header>

      <Container size="lg" component="main" className={classes.main}>
        {body}
      </Container>

      <Box component="footer" className={classes.footer}>
        <Container size="lg">
          <Group justify="space-between" gap="sm">
            <Text size="sm" c="dimmed" maw={640}>
              {tx.demo.footer}
            </Text>
            {isMockApi && (
              <Button variant="subtle" size="sm" onClick={reset}>
                {tx.demo.reset}
              </Button>
            )}
          </Group>
        </Container>
      </Box>
    </div>
  );
}
