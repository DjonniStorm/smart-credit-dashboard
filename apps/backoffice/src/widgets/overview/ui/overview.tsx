"use client";

import { Anchor, Button, Text } from "@mantine/core";
import Link from "next/link";

import type { ApplicationStatus } from "@repo/contracts";
import { StateBlock } from "@repo/ui/state-block";

import {
  countByGroup,
  formatDateTime,
  queueGroupLabel,
  stageLabel,
  stageOrder,
  statusLabel,
  useApplications,
} from "@/entities/application";

import classes from "./overview.module.css";

const decided: ApplicationStatus[] = [
  "approved",
  "counter_offer",
  "needs_client",
  "rejected",
];

const tiles = [
  { key: "decision", href: "/?tab=decision" },
  { key: "review", href: "/?tab=review" },
  { key: "client", href: "/?tab=client" },
  { key: "closed", href: "/?tab=closed" },
] as const;

/** Обзор конвейера: сколько заявок на каждом этапе и последние решения. */
export function Overview() {
  const apps = useApplications();

  if (apps.isPending) {
    return <StateBlock kind="loading" title="Загружаем заявки" />;
  }
  if (apps.isError) {
    return (
      <StateBlock
        kind="error"
        title="Заявки не загрузились"
        action={
          <Button variant="default" onClick={() => void apps.refetch()}>
            Повторить
          </Button>
        }
      >
        {apps.error.message}
      </StateBlock>
    );
  }
  if (apps.data.length === 0) {
    return (
      <StateBlock kind="empty" title="Заявок пока нет">
        Когда клиент подаст заявку, здесь появится её путь по конвейеру.
      </StateBlock>
    );
  }

  const counts = countByGroup(apps.data);
  const open = apps.data.filter((a) => a.waitingOn !== "nobody");
  const byStage = stageOrder.map((s) => ({
    stage: s,
    count: open.filter((a) => a.stage === s).length,
  }));
  const max = Math.max(1, ...byStage.map((s) => s.count));
  const decisions = apps.data
    .flatMap((a) =>
      a.events
        .filter(
          (e) =>
            e.actor.kind === "employee" &&
            e.toStatus !== null &&
            decided.includes(e.toStatus),
        )
        .map((e) => ({ ...e, app: a })),
    )
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .slice(0, 6);

  return (
    <div className={classes.grid}>
      <section
        className={classes.tiles}
        aria-label="Заявки по вкладкам очереди"
      >
        {tiles.map((t) => (
          <Link key={t.key} href={t.href} className={classes.tile}>
            <span className={classes.tileValue}>{counts[t.key]}</span>
            <span className={classes.tileLabel}>{queueGroupLabel[t.key]}</span>
          </Link>
        ))}
      </section>

      <section className={classes.card} aria-labelledby="stages-title">
        <h2 id="stages-title" className={classes.cardTitle}>
          Где сейчас заявки
        </h2>
        <Text size="sm" c="dimmed" mb="md">
          Открытые заявки по этапам конвейера, от приёма до выдачи
        </Text>
        <ol className={classes.stages}>
          {byStage.map(({ stage, count }) => (
            <li key={stage} className={classes.stage}>
              <span>{stageLabel[stage]}</span>
              <span className={classes.track} aria-hidden>
                <span
                  className={classes.bar}
                  style={{ width: `${(count / max) * 100}%` }}
                />
              </span>
              <span className={classes.stageCount}>{count}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className={classes.card} aria-labelledby="decisions-title">
        <h2 id="decisions-title" className={classes.cardTitle}>
          Последние решения сотрудников
        </h2>
        {decisions.length === 0 ? (
          <Text size="sm" c="dimmed" mt="xs">
            Решений пока не было. Они появятся после первого одобрения, запроса
            документов или отказа.
          </Text>
        ) : (
          <ul className={classes.decisions}>
            {decisions.map((e) => (
              <li key={e.id} className={classes.decision}>
                <div>
                  <Anchor
                    component={Link}
                    href={`/?open=${e.app.id}`}
                    size="sm"
                    fw={500}
                    c="var(--mantine-color-text)"
                    underline="always"
                  >
                    № {e.app.number} · {e.app.applicant.name}
                  </Anchor>
                  <Text size="xs" c="dimmed">
                    {e.actor.name}, {formatDateTime(e.at)}
                  </Text>
                </div>
                <Text size="sm" className={classes.decisionStatus}>
                  {e.toStatus && statusLabel[e.toStatus]}
                </Text>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
