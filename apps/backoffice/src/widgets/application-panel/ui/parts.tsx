"use client";

import { Anchor, Badge, Button, Card, Group, List, Stack, Text } from "@mantine/core";
import {
  IconAlertCircle,
  IconArrowRight,
  IconBuildingBank,
  IconCircleCheck,
  IconCircleX,
  IconClockHour4,
  IconFileText,
  IconReceiptTax,
  IconUserSearch,
} from "@tabler/icons-react";
import Link from "next/link";
import { useState } from "react";

import type {
  Application,
  ApplicationStage,
  CheckSource,
  CheckState,
  Employee,
  RiskBand,
} from "@repo/contracts/application";
import { Alfi, AlfiState } from "@repo/ui/alfi";
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
  waitingLabel,
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

      <AutonomyStatus app={app} />

      <WorkflowStateCards app={app} />
    </Stack>
  );
}

function AutonomyStatus({ app }: { app: Application }) {
  const snapshot = app.autonomy;
  if (!snapshot) {
    return (
      <Card withBorder radius="md" padding="sm" bg="var(--kk-surface-sunken)">
        <Text size="sm" fw={700}>Автономность решения</Text>
        <Text size="xs" c="dimmed" mt={4}>Данные policy ещё не загружены.</Text>
      </Card>
    );
  }
  const { config, eligibility } = snapshot;
  const inBand = app.request.amount >= config.amountBand.min && app.request.amount <= config.amountBand.max;
  const eligible = eligibility.eligible && inBand;
  return (
    <Card withBorder radius="md" padding="sm" bg="var(--kk-surface-sunken)">
      <Group justify="space-between" align="center" mb={4}>
        <Text size="sm" fw={700}>Автономность решения</Text>
        <Badge size="sm" color={eligible ? "green" : "gray"} variant="light">
          {eligible ? "Доступна" : "Только контроль"}
        </Badge>
      </Group>
      <Text size="xs" c="dimmed">{config.modelVersion} · {config.policyVersion} · уровень {config.level}</Text>
      <Text size="xs" c="dimmed" mt={4}>Контрольное окно: {eligibility.controlWindow === "open" ? "открыто" : "закрыто"}.</Text>
      {!inBand && <Text size="xs" c="orange" mt={4}>Сумма вне диапазона автономного решения.</Text>}
      {!eligible && eligibility.reasons.length > 0 && <Text size="xs" c="dimmed" mt={4}>{eligibility.reasons[0]}</Text>}
    </Card>
  );
}

const workflowDescription: Record<
  Application["stage"],
  { short: string; detail: string; owner: string }
> = {
  intake: {
    short: "Анкета и цель",
    detail: "Фиксируем продукт, сумму, срок и сведения о компании.",
    owner: "Клиент",
  },
  completeness: {
    short: "Документы",
    detail: "Проверяем комплектность и качество загруженных документов.",
    owner: "Банк",
  },
  enrichment: {
    short: "ФНС · ЕГРЮЛ · БКИ",
    detail: "Получаем подтверждения из внешних и внутренних источников.",
    owner: "Система",
  },
  scoring: {
    short: "Риск-профиль",
    detail: "Рассчитываем score и объясняем вклад факторов в риск.",
    owner: "Модель",
  },
  decision: {
    short: "Условия кредита",
    detail: "Правила продукта превращают скоринг в рекомендацию по заявке.",
    owner: "Сотрудник банка",
  },
  signing: {
    short: "Договор",
    detail: "Клиент принимает предложение и подписывает договор.",
    owner: "Клиент",
  },
  disbursement: {
    short: "Зачисление",
    detail: "Проверяем финальные условия и отправляем деньги клиенту.",
    owner: "Банк",
  },
};

/** Интерактивный путь заявки: состояние берётся из доменного Application. */
export function WorkflowStateCards({ app }: { app: Application }) {
  const selectionKey = `${app.id}:${app.stage}:${app.status}`;
  const [selection, setSelection] = useState<{
    key: string;
    stage: ApplicationStage;
  } | null>(null);

  const selectedStage =
    selection?.key === selectionKey ? selection.stage : app.stage;
  const current = stageOrder.indexOf(app.stage);
  const selectedMeta = workflowDescription[selectedStage];
  const isTerminal =
    app.status === "rejected" ||
    app.status === "disbursed" ||
    app.waitingOn === "nobody";

  return (
    <section
      className={classes.workflow}
      aria-labelledby={`workflow-${app.id}`}
    >
      <Group justify="space-between" align="center" mb={8}>
        <Text
          id={`workflow-${app.id}`}
          size="xs"
          fw={700}
          tt="uppercase"
          c="dimmed"
        >
          Путь заявки
        </Text>
        <Text size="xs" c="dimmed">
          {current + 1} из {stageOrder.length} · {waitingLabel[app.waitingOn]}
        </Text>
      </Group>
      <ol
        className={classes.workflowGrid}
        aria-label="Этапы заявки"
      >
        {stageOrder.map((stage, index) => {
          const isDone = index < current || (isTerminal && index === current);
          const isCurrent = index === current;
          const isSelected = stage === selectedStage;
          return (
            <li key={stage} className={classes.workflowItem}>
              <Button
                variant="subtle"
                color="dark"
                className={classes.workflowCard}
                data-state={
                  isDone
                    ? "done"
                    : isCurrent
                      ? isTerminal ||
                        app.waitingOn === "client" ||
                        app.waitingOn === "system"
                        ? "waiting"
                        : "current"
                      : "next"
                }
                data-selected={isSelected}
                onClick={() => setSelection({ key: selectionKey, stage })}
                aria-pressed={isSelected}
                aria-current={isCurrent ? "step" : undefined}
              >
                <span className={classes.workflowText}>
                  <strong>{stageLabel[stage]}</strong>
                  <small>{workflowDescription[stage].short}</small>
                </span>
              </Button>
            </li>
          );
        })}
      </ol>
      <div className={classes.workflowDetail} aria-live="polite">
        <div>
          <Text size="xs" fw={700}>
            {stageLabel[selectedStage]}
          </Text>
          <Text size="xs" c="dimmed">
            {selectedMeta.detail}
          </Text>
        </div>
        <span className={classes.workflowOwner}>
          {selectedMeta.owner}
          <IconArrowRight size={13} />
        </span>
      </div>
    </section>
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
  if (app.status === "rejected") {
    return AlfiState.Attention;
  }
  if (app.status === "disbursed") {
    return AlfiState.Success;
  }
  if (app.waitingOn === "system") {
    return AlfiState.Checking;
  }
  if (app.waitingOn === "client") {
    return AlfiState.NeedsAnswer;
  }
  if (app.status === "approved") {
    return AlfiState.Success;
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
  if (app.status === "rejected") {
    return app.rejectReason
      ? `Отказ зафиксирован: ${rejectReasonLabel[app.rejectReason].toLowerCase()}. Причина и факторы доступны в истории.`
      : "Решение отклонено. Проверьте причину и историю факторов.";
  }
  if (app.status === "disbursed") {
    return "Выдача завершена: деньги перечислены клиенту. Проверьте историю операции.";
  }
  if (app.status === "needs_client") {
    const items = app.requestedInfo.slice(0, 2).join(", ").toLowerCase();
    return items
      ? `Ждём от клиента: ${items}. После ответа проверки запустятся повторно.`
      : "Клиент должен ответить на запрос. После этого заявка вернётся в очередь.";
  }
  if (app.status === "counter_offer") {
    if (app.offer) {
      return `Клиенту предложены другие условия: ${formatRub(app.offer.amount)} на ${formatMonths(app.offer.termMonths)} под ${app.offer.ratePct} %.`;
    }
    return "Клиенту отправлено встречное предложение. Дождитесь его ответа.";
  }
  if (app.status === "approved") {
    return "Заявка одобрена. Клиенту осталось подписать договор, после чего банк выполнит выдачу.";
  }
  if (app.decision) {
    return `Рекомендация «${recommendationLabel[app.decision.recommendation].toLowerCase()}». Сверьте факторы и подтвердите или измените решение.`;
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
