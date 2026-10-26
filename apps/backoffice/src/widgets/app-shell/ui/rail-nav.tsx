"use client";

import { Divider } from "@mantine/core";
import {
  IconBooks,
  IconClockHour4,
  IconFileText,
  IconHome,
  IconSettings,
  IconUserCircle,
} from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { backofficeText, i18n } from "@repo/i18n";

import { countByGroup, useApplications } from "@/entities/application";

import classes from "./arm-shell.module.css";

type Item = {
  href: string;
  label: string;
  icon: typeof IconHome;
  count?: number;
  active: boolean;
};

function Items({ items, collapsed }: { items: Item[]; collapsed: boolean }) {
  return items.map((it) => (
    <Link
      key={it.href}
      href={it.href}
      className={classes.navItem}
      aria-current={it.active ? "page" : undefined}
      aria-label={collapsed ? it.label : undefined}
      title={collapsed ? it.label : undefined}
    >
      <it.icon size={20} stroke={1.5} aria-hidden />
      <span className={classes.navLabel}>{it.label}</span>
      {it.count !== undefined && it.count > 0 && (
        <span className={classes.navCount}>{it.count}</span>
      )}
    </Link>
  ));
}

/**
 * Меню слева: разделы АРМ. Статусные вкладки («На проверке», «Решения» и
 * остальные группы) живут только на странице очереди, чтобы не дублировать
 * один и тот же фильтр в двух местах.
 */
function Nav({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname();
  const apps = useApplications();
  const counts = apps.data ? countByGroup(apps.data) : null;
  const onQueue = pathname === "/" || pathname.startsWith("/applications");

  const main: Item[] = [
    {
      href: "/overview",
      label: "Обзор",
      icon: IconHome,
      active: pathname === "/overview",
    },
    {
      href: "/",
      label: "Очередь заявок",
      icon: IconFileText,
      count: counts?.all,
      active: onQueue,
    },
    {
      href: "/journal",
      label: "Журнал",
      icon: IconClockHour4,
      active: pathname === "/journal",
    },
  ];
  const secondary: Item[] = [
    {
      href: "/products",
      label: "Справочники",
      icon: IconBooks,
      active: pathname === "/products",
    },
    {
      href: "/profile",
      label: backofficeText(i18n.defaultLocale).nav.profile,
      icon: IconUserCircle,
      active: pathname === "/profile",
    },
    {
      href: "/settings",
      label: "Настройки",
      icon: IconSettings,
      active: pathname === "/settings",
    },
  ];

  return (
    <nav className={classes.nav} aria-label="Разделы АРМ">
      <Items items={main} collapsed={collapsed} />
      <Divider my="sm" color="var(--kk-line)" />
      <Items items={secondary} collapsed={collapsed} />
    </nav>
  );
}

export function RailNav({ collapsed }: { collapsed: boolean }) {
  return (
    <div
      className={`${classes.rail} ${collapsed ? classes.railCollapsed : ""}`}
    >
      <Nav collapsed={collapsed} />
    </div>
  );
}
