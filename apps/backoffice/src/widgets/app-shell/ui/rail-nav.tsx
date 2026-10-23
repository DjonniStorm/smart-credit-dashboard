"use client";

import { Divider, Text } from "@mantine/core";
import {
  IconBooks,
  IconClipboardCheck,
  IconClockHour4,
  IconFileText,
  IconHome,
  IconListCheck,
  IconSettings,
} from "@tabler/icons-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { countByGroup, useApplications } from "@/entities/application";

import classes from "./arm-shell.module.css";

type Item = {
  href: string;
  label: string;
  icon: typeof IconHome;
  count?: number;
  active: boolean;
};

function Items({ items }: { items: Item[] }) {
  return items.map((it) => (
    <Link
      key={it.href}
      href={it.href}
      className={classes.navItem}
      aria-current={it.active ? "page" : undefined}
    >
      <it.icon size={20} stroke={1.5} aria-hidden />
      <span className={classes.navLabel}>{it.label}</span>
      {it.count !== undefined && it.count > 0 && (
        <span className={classes.navCount}>{it.count}</span>
      )}
    </Link>
  ));
}

function Nav({ tab }: { tab: string | null }) {
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
      active: onQueue && tab !== "review" && tab !== "decision",
    },
    {
      href: "/?tab=review",
      label: "На проверке",
      icon: IconListCheck,
      count: counts?.review,
      active: pathname === "/" && tab === "review",
    },
    {
      href: "/?tab=decision",
      label: "Решения",
      icon: IconClipboardCheck,
      count: counts?.decision,
      active: pathname === "/" && tab === "decision",
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
      href: "/settings",
      label: "Настройки",
      icon: IconSettings,
      active: pathname === "/settings",
    },
  ];

  return (
    <nav className={classes.nav} aria-label="Разделы АРМ">
      <Text className={classes.navCaption}>Кредитный конвейер</Text>
      <Items items={main} />
      <Divider my="sm" color="var(--kk-line)" />
      <Items items={secondary} />
    </nav>
  );
}

function NavWithParams() {
  return <Nav tab={useSearchParams().get("tab")} />;
}

/** Меню слева: разделы со счётчиками заявок. */
export function RailNav() {
  return (
    <div className={classes.rail}>
      <Suspense fallback={<Nav tab={null} />}>
        <NavWithParams />
      </Suspense>
    </div>
  );
}
