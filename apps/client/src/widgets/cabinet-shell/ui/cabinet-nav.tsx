"use client";

import { AppShell, Badge, NavLink } from "@mantine/core";
import {
  IconBuildingSkyscraper,
  IconCreditCard,
  IconFileText,
  IconFiles,
  IconHelpCircle,
  IconHome,
  IconLayoutGrid,
  IconReceipt2,
  type Icon as TablerIcon,
} from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { lx } from "@/shared/i18n";

import classes from "./cabinet-shell.module.css";

const t = lx.nav;

type Item = {
  label: string;
  icon: TablerIcon;
  href?: string;
  active?: (p: string) => boolean;
};

const isApplication = (p: string) =>
  p === "/" || (p.startsWith("/applications/") && p !== "/applications/new");

// Порядок как в business.jpg. Разделов банка, которых нет в прототипе,
// не прячем: подписываем, что их нет в демо.
const items: Item[] = [
  {
    label: t.home,
    icon: IconHome,
    href: "/home",
    active: (p) => {
      return p === "/home";
    },
  },
  {
    label: t.credits,
    icon: IconCreditCard,
    href: "/products",
    active: (p) => p.startsWith("/products") || p === "/applications/new",
  },
  {
    label: t.applications,
    icon: IconFileText,
    href: "/",
    active: isApplication,
  },
  {
    label: t.documents,
    icon: IconFiles,
    href: "/documents",
    active: (p) => p.startsWith("/documents"),
  },
  {
    label: t.company,
    icon: IconBuildingSkyscraper,
    href: "/company",
    active: (p) => p.startsWith("/company"),
  },
  { label: t.accounting, icon: IconReceipt2 },
  { label: t.services, icon: IconLayoutGrid },
];

function Entry({
  item,
  pathname,
  count,
  onNavigate,
}: {
  item: Item;
  pathname: string;
  count: number;
  onNavigate: () => void;
}) {
  const Icon = item.icon;
  const icon = <Icon size={20} stroke={1.5} aria-hidden />;

  if (!item.href) {
    return (
      <NavLink
        component="div"
        label={item.label}
        leftSection={icon}
        description={t.notInDemo}
        disabled
        className={classes.navLink}
      />
    );
  }

  const active = item.active?.(pathname) ?? false;
  const counter =
    item.href === "/" && count > 0 ? (
      <Badge circle size="md" variant="filled" aria-label={t.needsYou(count)}>
        {count}
      </Badge>
    ) : undefined;

  return (
    <NavLink
      component={Link}
      href={item.href}
      label={item.label}
      leftSection={icon}
      rightSection={counter}
      active={active}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={classes.navLink}
    />
  );
}

/** Боковое меню 220px: разделы кабинета, «Поддержка» внизу. */
export function CabinetNav({
  needsYou,
  onNavigate,
}: {
  needsYou: number;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  return (
    <>
      <AppShell.Section grow component="nav" aria-label={t.label}>
        {items.map((item) => (
          <Entry
            key={item.label}
            item={item}
            pathname={pathname}
            count={needsYou}
            onNavigate={onNavigate}
          />
        ))}
      </AppShell.Section>
      <AppShell.Section>
        <Entry
          item={{ label: t.support, icon: IconHelpCircle }}
          pathname={pathname}
          count={0}
          onNavigate={onNavigate}
        />
      </AppShell.Section>
    </>
  );
}
