"use client";

import { Anchor, Group, List, Stack, Text } from "@mantine/core";
import {
  IconAlertCircle,
  IconBuildingBank,
  IconCircleCheck,
  IconCircleX,
  IconClockHour4,
  IconFileText,
  IconReceiptTax,
  IconUserSearch,
} from "@tabler/icons-react";
import Link from "next/link";

import type {
  Application,
  CheckSource,
  CheckState,
  Employee,
  RiskBand,
} from "@repo/contracts/application";
import { Alfi, AlfiState } from "@repo/ui/alfi";
import { StageRail } from "@repo/ui/stage-rail";
import { StateBlock } from "@repo/ui/state-block";

import {
  formatDate,
  formatDateTimeFull,
  formatMonths,
  productLabel,
  recommendationLabel,
  riskLabel,
  stageLabel,
  stageOrder,
} from "@/entities/application";
import { RerunCheckButton } from "@/features/application-actions";
import { rejectReasonLabel } from "@/shared/api/arm";
import { formatRub } from "@/shared/lib/money";

import classes from "./application-panel.module.css";

/** Компания, сумма и срок крупно, продукт и путь по этапам. */
export function Summary({ app }: { app: Application }) {
  const { applicant, request } = app;
  return (
    <Stack gap="md">
      <Stack gap={4}>
        <Text className={classes.company}>{applicant.name}</Text>
        <Text size="sm" c="dimmed" className={classes.num}>
          ИНН {applicant.inn} <span className={classes.gap} />
          {applicant.legalForm === "ip" ? "ОГРНИП" : "ОГРН"} {applicant.ogrn}
        </Text>
        <Text size="sm" c="dimmed">
          {applicant.okved}
        </Text>
      </Stack>

      <div className={classes.amounts}>
        <div>
          <Text size="xs" c="dimmed">
            Запрошенная сумма
          </Text>
          <Text className={classes.big}>{formatRub(request.amount)}</Text>
        </div>
        <div>
          <Text size="xs" c="dimmed">
            Срок
          </Text>
          <Text className={classes.big}>
            {formatMonths(request.termMonths)}
          </Text>
        </div>
      </div>

      <div className={classes.product}>
        <span className={classes.productIcon} aria-hidden>
          <IconFileText size={18} stroke={1.5} />
        </span>
        <div>
          <Text size="xs" c="dimmed">
            Продукт
          </Text>
          <Text size="sm" fw={500}>
            {productLabel[request.productId]}
          </Text>
        </div>
      </div>

      <StageRail
        stages={stageOrder.map((s) => stageLabel[s])}
        current={stageOrder.indexOf(app.stage)}
        waitingForClient={app.waitingOn === "client"}
        label="Этап заявки"
      />
    </Stack>
  );
}

const sourceName: Record<CheckSource, string> = {
  egrul: "ЕГРЮЛ",
  fns: "ФНС",
  bki: "БКИ",
};

const sourceIcon = {
  egrul: IconBuildingBank,
  fns: IconReceiptTax,
  bki: IconUserSearch,
};

const stateView: Record<
  CheckState,
  { icon: typeof IconCircleCheck; tone: string; fallback: string }
> = {
  passed: { icon: IconCircleCheck, tone: "success", fallback: "Пройдена" },
  pending: { icon: IconClockHour4, tone: "warning", fallback: "Ждём ответ" },
  warning: {
    icon: IconAlertCircle,
    tone: "warning",
    fallback: "Есть замечания",
  },
  failed: { icon: IconCircleX, tone: "danger", fallback: "Не пройдена" },
  unavailable: { icon: IconCircleX, tone: "danger", fallback: "Нет ответа" },
};

/** Результаты проверок: источник, итог словами, время ответа. */
export function CheckResults({
  app,
  employee,
}: {
  app: Application;
  employee: Employee;
}) {
  if (app.checks.length === 0) {
    return (
      <StateBlock kind="empty" title="Проверки ещё не запускались">
        Конвейер запросит источники после проверки полноты заявки.
      </StateBlock>
    );
  }
  return (
    <ul className={classes.checks}>
      {app.checks.map((c) => {
        const SourceIcon = sourceIcon[c.source];
        const view = stateView[c.state];
        return (
          <li key={c.source} className={classes.check}>
            <SourceIcon
              size={18}
              stroke={1.5}
              className={classes.checkIcon}
              aria-hidden
            />
            <Text size="sm" fw={500} className={classes.checkName}>
              {sourceName[c.source]}
            </Text>
            <span className={classes.checkState} data-tone={view.tone}>
              <view.icon size={16} stroke={1.75} aria-hidden />
              <span>{c.state === "pending" ? view.fallback : c.summary}</span>
            </span>
            <Text size="xs" c="dimmed" className={classes.checkTime}>
              {c.respondedAt ? formatDateTimeFull(c.respondedAt) : "ответа нет"}
            </Text>
            {c.state === "unavailable" && (
              <div className={classes.checkAction}>
                <RerunCheckButton
                  applicationId={app.id}
                  employeeId={employee.id}
                  source={c.source}
                />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

const riskTone: Record<RiskBand, string> = {
  low: "success",
  moderate: "warning",
  high: "danger",
};

/** Кредитный риск: балл скоринга и рекомендация по правилам продукта. */
export function RiskBlock({ app }: { app: Application }) {
  return (
    <section className={classes.risk} aria-labelledby={`risk-${app.id}`}>
      <Text id={`risk-${app.id}`} size="sm" fw={600}>
        Кредитный риск
      </Text>
      {app.scoring ? (
        <div className={classes.riskLine}>
          <span
            className={classes.dot}
            data-tone={riskTone[app.scoring.band]}
            aria-hidden
          />
          <Text fw={600} className={classes.riskLabel}>
            {riskLabel[app.scoring.band]}
          </Text>
          <Text size="sm" className={classes.num}>
            <Text span fw={700} size="md">
              {app.scoring.score}
            </Text>{" "}
            из 100
          </Text>
        </div>
      ) : (
        <Text size="sm" c="dimmed">
          {app.waitingOn === "system"
            ? "Скоринг посчитается, когда ответят все источники."
            : "Скоринга ещё нет."}
        </Text>
      )}
      {app.decision && (
        <div className={classes.reason}>
          <Text size="xs" fw={600}>
            Рекомендация: {recommendationLabel[app.decision.recommendation]}
          </Text>
          <Text size="xs">{app.decision.explanation}</Text>
        </div>
      )}
      {app.waitingOn === "employee" && (
        <div className={classes.reason}>
          <Text size="xs" fw={600}>
            Что мешает решению:
          </Text>
          <Text size="xs">{app.blocker}</Text>
        </div>
      )}
      <Group gap="sm" wrap="nowrap" align="flex-start">
        <Alfi state={managerAlfiState(app)} size={40} />
        <Stack gap={2}>
          <Text size="sm" fw={600}>
            Альфи
          </Text>
          <Text size="xs">{managerAlfiMessage(app)}</Text>
        </Stack>
      </Group>
    </section>
  );
}

function managerAlfiState(app: Application): AlfiState {
  if (app.waitingOn === "system") {
    return AlfiState.Checking;
  }
  if (app.waitingOn === "client") {
    return AlfiState.NeedsAnswer;
  }
  if (app.status === "rejected") {
    return AlfiState.Attention;
  }
  if (app.waitingOn === "nobody") {
    return AlfiState.Success;
  }
  if (app.decision) {
    return AlfiState.Explain;
  }
  return AlfiState.Idle;
}

function managerAlfiMessage(app: Application): string {
  if (app.waitingOn === "system") {
    return "Источники ещё проверяются. Решение появится после ответа системы.";
  }
  if (app.waitingOn === "client") {
    return "Клиент должен ответить на запрос. После этого заявка вернётся в очередь.";
  }
  if (app.status === "rejected") {
    return "Решение отклонено. Проверьте причину и историю факторов.";
  }
  if (app.decision) {
    return "Рекомендация готова. Сверьте факторы и подтвердите или измените её.";
  }
  return app.blocker;
}

/** Что уже решено: условия, запрос клиенту или причина отказа. */
export function Outcome({ app }: { app: Application }) {
  if (app.status === "needs_client" && app.requestedInfo.length > 0) {
    return (
      <Stack gap={4}>
        <Text size="sm" fw={600}>
          Запрошено у клиента
        </Text>
        <List size="sm" spacing={2}>
          {app.requestedInfo.map((i) => (
            <List.Item key={i}>{i}</List.Item>
          ))}
        </List>
      </Stack>
    );
  }
  if (app.status === "rejected" && app.rejectReason) {
    return (
      <Text size="sm">
        <Text span fw={600}>
          Причина отказа:{" "}
        </Text>
        {rejectReasonLabel[app.rejectReason].toLowerCase()}
      </Text>
    );
  }
  if (
    app.offer &&
    ["counter_offer", "approved", "disbursed"].includes(app.status)
  ) {
    return (
      <Stack gap={4}>
        <Text size="sm" fw={600}>
          {app.status === "counter_offer"
            ? "Предложено клиенту"
            : "Одобренные условия"}
        </Text>
        <Text size="sm" className={classes.num}>
          {productLabel[app.offer.productId]}, {formatRub(app.offer.amount)} на{" "}
          {formatMonths(app.offer.termMonths)}, {app.offer.ratePct} %
        </Text>
      </Stack>
    );
  }
  return null;
}

/** Вкладка «Данные»: заявка и клиент списком подпись-значение. */
export function DataList({
  app,
  assignee,
}: {
  app: Application;
  assignee: string;
}) {
  const { applicant, request } = app;
  const rows: [string, string][] = [
    ["Цель", request.purpose],
    ["Руководитель", applicant.director],
    ["Регион", applicant.region],
    ["Дата регистрации", formatDate(applicant.registeredAt)],
    [
      "Выручка за 12 мес.",
      `${formatRub(applicant.annualRevenue)}, со слов клиента`,
    ],
    ["Ответственный", assignee],
  ];
  return (
    <Stack gap="md">
      <Outcome app={app} />
      <dl className={classes.facts}>
        {rows.map(([k, v]) => (
          <div key={k} className={classes.fact}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <Anchor
        component={Link}
        href="/products"
        size="sm"
        c="var(--mantine-color-text)"
        underline="always"
      >
        Как считается скоринг и правила продуктов
      </Anchor>
    </Stack>
  );
}
