"use client";

import { Button, Select, TextInput } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { IconCalendar, IconSearch } from "@tabler/icons-react";
import { type Ref } from "react";

import type {
  ApplicationStage,
  CreditProductId,
  Employee,
} from "@repo/contracts/application";

import { productLabel, stageLabel, stageOrder } from "@/entities/application";

import {
  type AmountRange,
  type QueueFilters,
  amountRangeLabel,
  defaultFilters,
  isFiltered,
} from "../model/filters";
import classes from "./queue-filter-bar.module.css";

/** Строка фильтров над очередью: поиск, продукт, сумма, этап, ответственный, период. */
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

  return (
    <div className={classes.bar} role="search" aria-label="Фильтры очереди">
      <TextInput
        ref={searchRef}
        aria-label="Компания, ИНН или номер заявки"
        placeholder="Компания, ИНН или номер заявки"
        leftSection={<IconSearch size={16} stroke={1.5} aria-hidden />}
        value={value.search}
        onChange={(e) => set("search", e.currentTarget.value)}
        className={classes.search}
      />
      <Select
        aria-label="Продукт"
        placeholder="Продукт"
        clearable
        data={Object.entries(productLabel).map(([v, label]) => ({
          value: v,
          label,
        }))}
        value={value.product}
        onChange={(v) => set("product", v as CreditProductId | null)}
        className={classes.product}
        comboboxProps={{ width: 220, position: "bottom-start" }}
      />
      <Select
        aria-label="Сумма"
        placeholder="Сумма"
        clearable
        data={Object.entries(amountRangeLabel).map(([v, label]) => ({
          value: v,
          label,
        }))}
        value={value.amount}
        onChange={(v) => set("amount", v as AmountRange | null)}
        className={classes.amount}
        comboboxProps={{ width: 180, position: "bottom-start" }}
      />
      <Select
        aria-label="Этап"
        placeholder="Этап"
        clearable
        data={stageOrder.map((s) => ({ value: s, label: stageLabel[s] }))}
        value={value.stage}
        onChange={(v) => set("stage", v as ApplicationStage | null)}
        className={classes.stage}
        comboboxProps={{ width: 180, position: "bottom-start" }}
      />
      <Select
        aria-label="Ответственный"
        placeholder="Ответственный"
        clearable
        data={[
          { value: currentEmployeeId, label: "Мои заявки" },
          { value: "none", label: "Не назначен" },
          ...employees
            .filter((e) => e.id !== currentEmployeeId)
            .map((e) => ({ value: e.id, label: e.name })),
        ]}
        value={value.assignee}
        onChange={(v) => set("assignee", v)}
        className={classes.assignee}
        comboboxProps={{ width: 220, position: "bottom-start" }}
      />
      <DatePickerInput
        type="range"
        aria-label="Период подачи"
        placeholder="Период подачи"
        leftSection={<IconCalendar size={16} stroke={1.5} aria-hidden />}
        valueFormat="DD.MM.YYYY"
        clearable
        allowSingleDateInRange
        value={value.period}
        onChange={(v) =>
          set("period", [
            v[0] ? String(v[0]).slice(0, 10) : null,
            v[1] ? String(v[1]).slice(0, 10) : null,
          ])
        }
        className={classes.period}
      />
      {isFiltered(value) && (
        <Button
          variant="subtle"
          color="gray"
          onClick={() =>
            onChange({ ...defaultFilters, sort: value.sort, dir: value.dir })
          }
        >
          Сбросить
        </Button>
      )}
    </div>
  );
}
