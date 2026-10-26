"use client";

import { AppShell, Badge, Divider, NavLink } from "@mantine/core";
import {
  IconBuildingSkyscraper,
  IconCreditCard,
  IconFileText,
  IconFiles,
  IconHome,
  IconSettings,
  IconUserCircle,
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
  href: string;
  active?: (p: string) => boolean;
};

const isApplication = (p: string) =>
  p === "/" || (p.startsWith("/applications/") && p !== "/applications/new");

// Порядок как в business.jpg. Разделы, которых нет в прототипе, скрыты.
const items: Item[] = [
  {
    label: t.home,
    icon: IconHome,
    href: "/home",
    active: (p) => p === "/home" || p.startsWith("/home/"),
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
];

const secondary: Item[] = [
  {
    label: t.profile,
    icon: IconUserCircle,
    href: "/profile",
    active: (p) => p.startsWith("/profile"),
  },
  {
    label: t.settings,
    icon: IconSettings,
    href: "/settings",
    active: (p) => p.startsWith("/settings"),
  },
];

function Entry({
  item,
  pathname,
  count,
  onNavigate,
  collapsed,
}: {
  item: Item;
  pathname: string;
  count: number;
  onNavigate: () => void;
  collapsed: boolean;
}) {
  const Icon = item.icon;
  const icon = <Icon size={20} stroke={1.5} aria-hidden />;

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
      aria-label={collapsed ? item.label : undefined}
      title={collapsed ? item.label : undefined}
      onClick={onNavigate}
      className={classes.navLink}
    />
  );
}

/** Боковое меню 220px: разделы кабинета. Свёрнутое — только иконки. */
export function CabinetNav({
  needsYou,
  onNavigate,
  collapsed,
}: {
  needsYou: number;
  onNavigate: () => void;
  collapsed: boolean;
}) {
  const pathname = usePathname();
  return (
    <AppShell.Section
      grow
      component="nav"
      aria-label={t.label}
      className={`${classes.navList} ${collapsed ? classes.railCollapsed : ""}`}
    >
      {items.map((item) => (
        <Entry
          key={item.label}
          item={item}
          pathname={pathname}
          count={needsYou}
          onNavigate={onNavigate}
          collapsed={collapsed}
        />
      ))}
      <Divider my="sm" color="var(--kk-line)" />
      {secondary.map((item) => (
        <Entry
          key={item.label}
          item={item}
          pathname={pathname}
          count={needsYou}
          onNavigate={onNavigate}
          collapsed={collapsed}
        />
      ))}
    </AppShell.Section>
  );
}
