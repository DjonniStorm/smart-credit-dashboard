"use client";

import { Anchor, Button, Group, Text } from "@mantine/core";
import Link from "next/link";

import { StateBlock } from "@repo/ui/state-block";

import {
  productLabel,
  stageLabel,
  statusLabel,
  useManagerReport,
} from "@/entities/application";

import classes from "./overview.module.css";
import { StageRoadmap } from "./stage-roadmap";

const decisionLabels = [
  ["approve", "Одобрено"],
  ["counterOffer", "Встречное предложение"],
  ["reject", "Отказ"],
] as const;

const reportStatusLabel: Record<string, string> = {
  ...statusLabel,
  accepted: "Принята",
  signing: "Подписание",
  funded: "Выдан",
  cancelled: "Отменена",
  unknown: "Неизвестно",
};

function formatShare(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatDate(value: string, timezone?: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    timeZone: timezone,
  }).format(new Date(value));
}

/** Обзор менеджера по агрегированному read-only отчёту API. */
export function Overview() {
  const report = useManagerReport("overview");

  if (report.isPending) {
    return <StateBlock kind="loading" title="Загружаем отчёт" />;
  }
  if (report.isError) {
    return (
      <StateBlock
        kind="error"
        title="Отчёт не загрузился"
        action={
          <Button variant="default" onClick={() => void report.refetch()}>
            Повторить
          </Button>
        }
      >
        {report.error.message}
      </StateBlock>
    );
  }

  const data = report.data;
  const topStage = [...data.population.byStage].sort(
    (a, b) => b.count - a.count,
  )[0];
  const latestBucket = data.timeseries.at(-1);
  const journalParams = new URLSearchParams({
    from: data.query.from,
    to: data.query.to,
    timezone: data.query.timezone,
    view: "journal",
    bucket: data.query.bucket,
  });
  if (data.query.search) {
    journalParams.set("search", data.query.search);
  }
  const journalHref = `/journal?${journalParams.toString()}`;

  return (
    <div className={classes.grid}>
      <Group justify="space-between" align="center" wrap="wrap">
        <Text size="sm" c="dimmed">
          Отчёт за период {formatDate(data.query.from, data.query.timezone)} —{" "}
          {formatDate(data.query.to, data.query.timezone)}.
        </Text>
        <Anchor component={Link} href={journalHref} underline="always">
          Открыть журнал событий
        </Anchor>
      </Group>
      <section
        className={classes.tiles}
        aria-label="Ключевые показатели отчёта"
      >
        <article className={classes.tile}>
          <span className={classes.tileValue}>
            {data.population.applications}
          </span>
          <span className={classes.tileLabel}>Заявок в периоде</span>
        </article>
        <article className={classes.tile}>
          <span className={classes.tileValue}>{data.activity.events}</span>
          <span className={classes.tileLabel}>Событий активности</span>
        </article>
        <article className={classes.tile}>
          <span className={classes.tileValue}>{data.decisions.total}</span>
          <span className={classes.tileLabel}>Решений сотрудников</span>
        </article>
        <article className={classes.tile}>
          <span className={classes.tileValue}>
            {data.sla.byState.find((item) => item.state === "overdue")?.count ??
              0}
          </span>
          <span className={classes.tileLabel}>Просроченных SLA-срезов</span>
        </article>
      </section>

      <section className={classes.card} aria-labelledby="stages-title">
        <h2 id="stages-title" className={classes.cardTitle}>
          Путь заявок
        </h2>
        <Text size="sm" c="dimmed" mb="md">
          Сколько заявок сейчас на каждом этапе обработки.
        </Text>
        <StageRoadmap byStage={data.population.byStage} />
        {topStage && topStage.count > 0 && (
          <Text size="sm" c="dimmed" mt="md">
            Больше всего заявок на этапе «{stageLabel[topStage.stage]}»:{" "}
            {topStage.count}.
          </Text>
        )}
      </section>

      <section className={classes.card} aria-labelledby="decisions-title">
        <h2 id="decisions-title" className={classes.cardTitle}>
          Решения и расхождения
        </h2>
        <Text size="sm" c="dimmed" mb="md">
          Решения считаются по событиям. Рекомендация берётся из события
          скоринга или помечается как неизвестная, если исторического контекста
          нет.
        </Text>
        <div className={classes.metricList}>
          {decisionLabels.map(([key, label]) => {
            const item = data.decisions[key];
            return (
              <div key={key} className={classes.metricRow}>
                <span>{label}</span>
                <strong>{item.count}</strong>
                <span className={classes.metricShare}>
                  {formatShare(item.share)}
                </span>
              </div>
            );
          })}
          <div className={classes.metricRow}>
            <span>Расхождение с рекомендацией</span>
            <strong>{data.recommendation.overridden}</strong>
            <span className={classes.metricShare}>
              {data.recommendation.overrideRate === null
                ? "—"
                : formatShare(data.recommendation.overrideRate)}
            </span>
          </div>
          <div className={classes.metricRow}>
            <span>Совпало с рекомендацией</span>
            <strong>{data.recommendation.matched}</strong>
            <span className={classes.metricShare}>
              {formatShare(
                data.recommendation.matched /
                  Math.max(
                    1,
                    data.recommendation.matched +
                      data.recommendation.overridden,
                  ),
              )}
            </span>
          </div>
          <div className={classes.metricRow}>
            <span>Без исторической рекомендации</span>
            <strong>{data.recommendation.unknown}</strong>
            <span className={classes.metricShare}>
              {data.coverage.recommendation.quality === "complete"
                ? "—"
                : "неполно"}
            </span>
          </div>
        </div>
        {data.decisions.total === 0 && (
          <Text size="sm" c="dimmed" mt="md">
            Решений за выбранный период нет.
          </Text>
        )}
      </section>

      <section className={classes.card} aria-labelledby="sla-title">
        <h2 id="sla-title" className={classes.cardTitle}>
          SLA и автономность
        </h2>
        <div className={classes.splitMetrics}>
          <div>
            <Text size="sm" c="dimmed">
              SLA
            </Text>
            <Text fw={600} mt={4}>
              {data.sla.byState.find((item) => item.state === "on_track")
                ?.count ?? 0}{" "}
              в срок
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              {data.coverage.sla.quality === "complete"
                ? "Данные полные"
                : "Есть события без контекста"}
            </Text>
          </div>
          <div>
            <Text size="sm" c="dimmed">
              Автономность
            </Text>
            <Text fw={600} mt={4}>
              {data.autonomy.byMode.find((item) => item.mode === "controlled")
                ?.count ?? 0}{" "}
              controlled
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              {data.coverage.autonomy.quality === "unknown"
                ? "Нет контекста"
                : "Событийный ряд"}
            </Text>
          </div>
        </div>
        {latestBucket && (
          <Text size="xs" c="dimmed" mt="md">
            Последний бакет:{" "}
            {formatDate(latestBucket.bucketStart, data.query.timezone)} ·{" "}
            {latestBucket.events} событий
          </Text>
        )}
      </section>

      <section className={classes.card} aria-labelledby="products-title">
        <h2 id="products-title" className={classes.cardTitle}>
          Продукты
        </h2>
        <div className={classes.metricList}>
          {data.population.byProduct.map((item) => (
            <div key={item.productId} className={classes.metricRow}>
              <span>{productLabel[item.productId]}</span>
              <strong>{item.applications}</strong>
              <span className={classes.metricShare}>{item.overdue} проср.</span>
            </div>
          ))}
        </div>
        {data.population.byProduct.length === 0 && (
          <Text size="sm" c="dimmed">
            Нет данных по продуктам.
          </Text>
        )}
      </section>

      <section className={classes.card} aria-labelledby="status-title">
        <h2 id="status-title" className={classes.cardTitle}>
          Статусы
        </h2>
        <div className={classes.metricList}>
          {data.population.byStatus.map((item) => (
            <div key={item.status} className={classes.metricRow}>
              <span>{reportStatusLabel[item.status] ?? "Неизвестно"}</span>
              <strong>{item.count}</strong>
              <span className={classes.metricShare}>
                {formatShare(item.share)}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
