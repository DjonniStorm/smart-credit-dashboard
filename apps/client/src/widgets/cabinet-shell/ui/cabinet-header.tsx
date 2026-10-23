"use client";

import {
  ActionIcon,
  Avatar,
  Burger,
  Group,
  Indicator,
  Menu,
  Stack,
  Text,
  UnstyledButton,
  useComputedColorScheme,
  useMantineColorScheme,
} from "@mantine/core";
import {
  IconBell,
  IconChevronDown,
  IconLogout,
  IconMoon,
  IconSun,
} from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { Application, DemoAccount } from "@repo/contracts/cabinet";

import {
  needsClient,
  nextStepOf,
  useApplications,
} from "@/entities/application";
import { useSignOut } from "@/entities/session";
import { lx, tx } from "@/shared/i18n";

import { CabinetLogo as Logo } from "./cabinet-logo";
import { CabinetSearch } from "./cabinet-search";
import classes from "./cabinet-shell.module.css";

const initials = (person: string) =>
  person
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

function Notifications({ waiting }: { waiting: Application[] }) {
  const t = lx.notifications;
  return (
    <Menu position="bottom-end" width={320} shadow="md">
      <Menu.Target>
        <Indicator
          disabled={waiting.length === 0}
          color="var(--kk-brand-bright)"
          size={8}
          offset={10}
        >
          <ActionIcon
            variant="subtle"
            size={44}
            aria-label={waiting.length ? t.unread(waiting.length) : t.label}
          >
            <IconBell size={20} stroke={1.5} aria-hidden />
          </ActionIcon>
        </Indicator>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>{t.label}</Menu.Label>
        {waiting.length === 0 ? (
          <Text size="sm" c="dimmed" px="sm" pb="xs">
            {t.empty}
          </Text>
        ) : (
          waiting.map((a) => (
            <Menu.Item
              key={a.id}
              component={Link}
              href={`/applications/${a.id}`}
            >
              <Text size="sm" fw={600}>
                {tx.application.title(a.number)}
              </Text>
              <Text size="sm" c="dimmed">
                {nextStepOf(a)}
              </Text>
            </Menu.Item>
          ))
        )}
      </Menu.Dropdown>
    </Menu>
  );
}

function Account({ account }: { account: DemoAccount }) {
  const router = useRouter();
  const signOut = useSignOut();
  const { setColorScheme } = useMantineColorScheme();
  const scheme = useComputedColorScheme("light");

  return (
    <Menu position="bottom-end" width={280} shadow="md">
      <Menu.Target>
        <UnstyledButton
          className={classes.account}
          aria-label={lx.account.menu}
        >
          <Stack gap={0} visibleFrom="md" className={classes.accountText}>
            <Text size="sm" fw={600} lineClamp={1}>
              {account.company.name}
            </Text>
            <Text size="xs" c="dimmed">
              {lx.account.inn(account.company.inn)}
            </Text>
          </Stack>
          <Avatar radius="xl" size={36} color="primary">
            {initials(account.person)}
          </Avatar>
          <IconChevronDown size={16} stroke={1.5} aria-hidden />
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>
          {account.person}, {account.role.toLowerCase()}
        </Menu.Label>
        <Text size="sm" px="sm" pb="xs" hiddenFrom="md">
          {account.company.name}, {lx.account.inn(account.company.inn)}
        </Text>
        <Menu.Item
          leftSection={
            scheme === "dark" ? (
              <IconSun size={16} stroke={1.5} />
            ) : (
              <IconMoon size={16} stroke={1.5} />
            )
          }
          onClick={() => setColorScheme(scheme === "dark" ? "light" : "dark")}
        >
          {scheme === "dark" ? lx.account.lightTheme : lx.account.theme}
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item
          leftSection={<IconLogout size={16} stroke={1.5} />}
          onClick={() =>
            signOut.mutate(undefined, {
              onSuccess: () => router.replace("/login"),
            })
          }
        >
          {tx.nav.signOut}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}

function HeaderActions({ account }: { account: DemoAccount }) {
  const apps = useApplications();
  const waiting = (apps.data ?? []).filter(needsClient);
  return (
    <Group gap={4} wrap="nowrap">
      <Notifications waiting={waiting} />
      <Account account={account} />
    </Group>
  );
}

/** Шапка 52px: логотип, поиск по центру, уведомления и профиль справа. */
export function CabinetHeader({
  account,
  navOpened,
  onToggleNav,
}: {
  account: DemoAccount | null | undefined;
  navOpened: boolean;
  onToggleNav: () => void;
}) {
  return (
    <Group h="100%" px={{ base: "xs", sm: "md" }} gap="sm" wrap="nowrap">
      <Burger
        opened={navOpened}
        onClick={onToggleNav}
        hiddenFrom="sm"
        size="sm"
        aria-label={navOpened ? lx.nav.close : lx.nav.open}
      />
      <Logo />
      <div className={classes.searchSlot}>{account && <CabinetSearch />}</div>
      {account && <HeaderActions account={account} />}
    </Group>
  );
}
