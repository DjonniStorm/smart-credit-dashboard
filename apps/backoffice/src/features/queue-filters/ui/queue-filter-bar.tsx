"use client";

import { Button, Group, Kbd, Select, TextInput } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import { type Ref } from "react";

import type {
  ApplicationStage,
  CreditProductId,
  Employee,
} from "@repo/contracts/application";

import { productLabel, stageLabel, stageOrder } from "@/entities/application";

import { type QueueFilters, defaultFilters } from "../model/filters";

/** Поиск по ИНН, названию и номеру, фильтры по этапу, продукту, ответственному. */
export function QueueFilterBar({
  value,
  onChange,
  employees,
  currentEmployeeId,
  searchRef,
}: {
  value: QueueFilters;
  onChange: (next: QueueFilters) => void;
  employees: Employee[];
  currentEmployeeId: string;
  searchRef?: Ref<HTMLInputElement>;
}) {
  const set = <K extends keyof QueueFilters>(key: K, v: QueueFilters[K]) =>
    onChange({ ...value, [key]: v });
  const dirty =
    value.search ||
    value.stage ||
    value.product ||
    value.assignee ||
    value.tab !== "all";

  return (
    <Group gap="xs" align="flex-end" wrap="wrap">
      <TextInput
        ref={searchRef}
        aria-label="Поиск по ИНН, названию или номеру"
        placeholder="ИНН, название или номер"
        leftSection={<IconSearch size={16} aria-hidden />}
        rightSection={<Kbd size="xs">/</Kbd>}
        value={value.search}
        onChange={(e) => set("search", e.currentTarget.value)}
        w={{ base: "100%", sm: 260 }}
      />
      <Select
        aria-label="Этап"
        placeholder="Любой этап"
        clearable
        data={stageOrder.map((s) => ({ value: s, label: stageLabel[s] }))}
        value={value.stage}
        onChange={(v) => set("stage", v as ApplicationStage | null)}
        w={{ base: "100%", xs: 170 }}
      />
      <Select
        aria-label="Продукт"
        placeholder="Любой продукт"
        clearable
        data={Object.entries(productLabel).map(([v, label]) => ({
          value: v,
          label,
        }))}
        value={value.product}
        onChange={(v) => set("product", v as CreditProductId | null)}
        w={{ base: "100%", xs: 200 }}
      />
      <Select
        aria-label="Ответственный"
        placeholder="Любой ответственный"
        clearable
        data={[
          { value: currentEmployeeId, label: "Мои заявки" },
          { value: "none", label: "Без ответственного" },
          ...employees
            .filter((e) => e.id !== currentEmployeeId)
            .map((e) => ({ value: e.id, label: e.name })),
        ]}
        value={value.assignee}
        onChange={(v) => set("assignee", v)}
        w={{ base: "100%", xs: 200 }}
      />
      {dirty && (
        <Button
          variant="subtle"
          onClick={() =>
            onChange({ ...defaultFilters, sort: value.sort, dir: value.dir })
          }
        >
          Сбросить фильтры
        </Button>
      )}
    </Group>
  );
}
