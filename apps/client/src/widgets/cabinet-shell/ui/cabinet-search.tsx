"use client";

import { ActionIcon, Kbd, UnstyledButton } from "@mantine/core";
import {
  Spotlight,
  type SpotlightActionGroupData,
  spotlight,
} from "@mantine/spotlight";
import {
  IconBuildingSkyscraper,
  IconCreditCard,
  IconFileText,
  IconFiles,
  IconPlus,
  IconSearch,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";

import { applicationStatus } from "@repo/ui/application-status";

import { useApplications } from "@/entities/application";
import { useCatalog } from "@/entities/product";
import { lx, tx } from "@/shared/i18n";

import classes from "./cabinet-shell.module.css";

const t = lx.search;
const icon = { size: 18, stroke: 1.5, "aria-hidden": true } as const;

/** Поиск по разделам, заявкам и продуктам. Открывается и по Ctrl+K. */
export function CabinetSearch() {
  const router = useRouter();
  const apps = useApplications();
  const catalog = useCatalog();
  const products = catalog.data?.products ?? [];
  const productName = (id: string) =>
    products.find((p) => p.id === id)?.name ?? "";

  const go = (href: string) => () => router.push(href);

  const actions: SpotlightActionGroupData[] = [
    {
      group: t.pages,
      actions: [
        {
          id: "new",
          label: tx.wizard.title,
          leftSection: <IconPlus {...icon} />,
          onClick: go("/applications/new"),
        },
        {
          id: "products",
          label: tx.products.title,
          leftSection: <IconCreditCard {...icon} />,
          onClick: go("/products"),
        },
        {
          id: "applications",
          label: lx.applications.title,
          leftSection: <IconFileText {...icon} />,
          onClick: go("/"),
        },
        {
          id: "documents",
          label: lx.documents.title,
          leftSection: <IconFiles {...icon} />,
          onClick: go("/documents"),
        },
        {
          id: "company",
          label: lx.company.title,
          leftSection: <IconBuildingSkyscraper {...icon} />,
          onClick: go("/company"),
        },
      ],
    },
    {
      group: t.applications,
      actions: (apps.data ?? []).map((a) => ({
        id: `app-${a.id}`,
        label: t.application(a.number, productName(a.productId)),
        description: applicationStatus[a.status].label,
        keywords: [a.number, ...a.documents.map((d) => d.name)],
        leftSection: <IconFileText {...icon} />,
        onClick: go(`/applications/${a.id}`),
      })),
    },
    {
      group: t.products,
      actions: products.map((p) => ({
        id: `product-${p.id}`,
        label: p.name,
        description: p.description,
        leftSection: <IconCreditCard {...icon} />,
        onClick: go(
          `/applications/new?product=${p.id}&purpose=${p.purposes[0]}`,
        ),
      })),
    },
  ];

  return (
    <>
      <UnstyledButton
        className={classes.search}
        onClick={spotlight.open}
        visibleFrom="sm"
        aria-label={t.placeholder}
      >
        <IconSearch size={16} stroke={1.5} aria-hidden />
        <span className={classes.searchText}>{t.placeholder}</span>
        <Kbd size="xs" visibleFrom="lg">
          Ctrl K
        </Kbd>
      </UnstyledButton>
      <ActionIcon
        variant="subtle"
        size={44}
        hiddenFrom="sm"
        onClick={spotlight.open}
        aria-label={t.short}
      >
        <IconSearch size={20} stroke={1.5} aria-hidden />
      </ActionIcon>
      <Spotlight
        actions={actions}
        nothingFound={t.nothing}
        highlightQuery
        limit={12}
        shortcut={["mod + K"]}
        searchProps={{
          leftSection: <IconSearch size={18} stroke={1.5} aria-hidden />,
          placeholder: t.placeholder,
        }}
      />
    </>
  );
}
