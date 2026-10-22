"use client";

import { Kbd, UnstyledButton } from "@mantine/core";
import { useOs } from "@mantine/hooks";
import { Spotlight, spotlight } from "@mantine/spotlight";
import { IconSearch } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

import { productLabel, useApplications } from "@/entities/application";
import { formatRub } from "@/shared/lib/money";

import classes from "./arm-shell.module.css";

/** Поиск по заявкам, компаниям и ИНН. Открывается по клику и по Ctrl/⌘+K. */
export function HeaderSearch() {
  const apps = useApplications();
  const router = useRouter();
  const os = useOs();
  const mod = os === "macos" || os === "ios" ? "⌘" : "Ctrl";

  const actions = useMemo(
    () =>
      (apps.data ?? []).map((a) => ({
        id: a.id,
        label: `№ ${a.number} · ${a.applicant.name}`,
        description: `ИНН ${a.applicant.inn} · ${productLabel[a.request.productId]} · ${formatRub(a.request.amount)}`,
        keywords: [a.applicant.inn, a.number, a.applicant.ogrn],
        onClick: () => router.push(`/?open=${a.id}`),
      })),
    [apps.data, router],
  );

  return (
    <>
      <UnstyledButton
        className={classes.searchButton}
        onClick={spotlight.open}
        aria-label="Поиск по заявкам, компаниям и ИНН"
        aria-keyshortcuts="Control+K Meta+K"
      >
        <IconSearch size={16} stroke={1.5} aria-hidden />
        <span className={classes.searchText}>
          Поиск по заявкам, компаниям, ИНН
        </span>
        <Kbd size="xs" className={classes.searchKbd}>
          {mod} K
        </Kbd>
      </UnstyledButton>
      <Spotlight
        actions={actions}
        limit={8}
        highlightQuery
        nothingFound={
          apps.isPending
            ? "Загружаем заявки"
            : apps.isError
              ? "Заявки не загрузились, попробуйте позже"
              : "Ничего не нашлось. Проверьте ИНН или номер заявки"
        }
        searchProps={{
          leftSection: <IconSearch size={18} stroke={1.5} aria-hidden />,
          placeholder: "Номер заявки, компания или ИНН",
        }}
      />
    </>
  );
}
