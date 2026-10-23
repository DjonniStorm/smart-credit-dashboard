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
  CheckState,
  Employee,
  RiskBand,
} from "@repo/contracts/application";
import { backofficeText, i18n } from "@repo/i18n";
import { Alfi, AlfiState } from "@repo/ui/alfi";
import { StateBlock } from "@repo/ui/state-block";

import {
  formatDate,
  formatDateTimeFull,
  formatMonths,
  productLabel,
  recommendationLabel,
  riskLabel,
  stageOrder,
  waitingLabel,
} from "@/entities/application";
import { RerunCheckButton } from "@/features/application-actions";
import { rejectReasonLabel } from "@/shared/api/arm";

import { purposeLabel } from "@/shared/lib/purpose";
import { formatRub } from "@/shared/lib/money";

import classes from "./application-panel.module.css";

/** Компания, сумма и срок крупно, продукт и путь по этапам. */
export function Summary({ app }: { app: Application }) {
  const { applicant, request } = app;
  const tx = backofficeText(i18n.defaultLocale);
  return (
    <Stack gap="md">
      <Stack gap={4}>
        <Text className={classes.company}>{applicant.name}</Text>
        <Text size="sm" c="dimmed" className={classes.num}>
          {tx.summary.inn} {applicant.inn} <span className={classes.gap} />
          {tx.summary.ogrn(applicant.legalForm)} {applicant.ogrn}
        </Text>
        <Text size="sm" c="dimmed">
          {applicant.okved}
        </Text>
      </Stack>

      <div className={classes.amounts}>
        <div>
          <Text size="xs" c="dimmed">
            {tx.summary.requestedAmount}
          </Text>
          <Text className={classes.big}>{formatRub(request.amount)}</Text>
        </div>
        <div>
          <Text size="xs" c="dimmed">
            {tx.summary.term}
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
            {tx.summary.product}
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
  const tx = backofficeText(i18n.defaultLocale);
  const snapshot = app.autonomy;
  if (!snapshot) {
    return (
      <Card withBorder radius="md" padding="sm" bg="var(--kk-surface-sunken)">
        <Text size="sm" fw={700}>{tx.summary.autonomy}</Text>
        <Text size="xs" c="dimmed" mt={4}>{tx.summary.policyUnavailable}</Text>
      </Card>
    );
  }
  const { config, metrics, eligibility } = snapshot;
  const inBand = app.request.amount >= config.amountBand.min && app.request.amount <= config.amountBand.max;
    const eligible =
      snapshot.case?.mode === "controlled"
        ? snapshot.case.eligible && snapshot.case.disposition === "auto_offer_sent"
        : !snapshot.case && eligibility.eligible && inBand;
  return (
    <Card withBorder radius="md" padding="sm" bg="var(--kk-surface-sunken)">
      <Group justify="space-between" align="center" mb={4}>
        <Text size="sm" fw={700}>{tx.summary.autonomy}</Text>
        <Badge size="sm" color={eligible ? "green" : "gray"} variant="light">
          {eligible ? tx.summary.available : tx.summary.manualControl}
        </Badge>
      </Group>
      <Text size="xs" c="dimmed">{tx.summary.policyMeta(config.modelVersion, config.policyVersion, config.level)}</Text>
        {snapshot.case && (
          <Text size="xs" c="dimmed">{tx.summary.mode(snapshot.case.mode)}</Text>
        )}
      <Text size="xs" c="dimmed">
        {tx.summary.metrics(metrics.closedCases, metrics.eligibleCases)}
      </Text>
      <Text size="xs" c="dimmed">
        {tx.summary.overrides(
          metrics.manualOverrides,
          `${Math.round(metrics.manualOverrideRate * 100)}%`,
        )}
      </Text>
      <Text size="xs" c="dimmed">
        {tx.summary.calibration(
          metrics.calibrationStatus === "available"
            ? `${Math.round(metrics.calibrationError * 1000) / 10}%`
            : "нет данных",
        )}
      </Text>
        <Text size="xs" c="dimmed">{tx.summary.drift(tx.summary.driftLabel(metrics.driftStatus))}</Text>
      {snapshot.case && (
        <Text size="xs" fw={600}>
          {snapshot.case.disposition === "auto_offer_sent"
            ? tx.summary.caseStatus.auto
            : snapshot.case.disposition === "intercepted"
              ? tx.summary.caseStatus.intercepted
                : snapshot.case.disposition === "expired"
                  ? tx.summary.caseStatus.expired
                  : snapshot.case.disposition === "declined"
                    ? tx.summary.caseStatus.declined
                    : snapshot.case.disposition === "confirmed"
                      ? tx.summary.caseStatus.confirmed
                      : tx.summary.caseStatus.manual}
        </Text>
      )}
      <Text size="xs" c="dimmed" mt={4}>{tx.summary.controlWindow(eligibility.controlWindow === "open" ? tx.summary.windowOpen : tx.summary.windowClosed)}</Text>
      {!inBand && <Text size="xs" c="orange" mt={4}>{tx.summary.amountOutOfBand}</Text>}
      {!eligible && eligibility.reasons.length > 0 && <Text size="xs" c="dimmed" mt={4}>{eligibility.reasons[0]}</Text>}
    </Card>
  );
}

/** Интерактивный путь заявки: состояние берётся из доменного Application. */
export function WorkflowStateCards({ app }: { app: Application }) {
  const tx = backofficeText(i18n.defaultLocale);
  const selectionKey = `${app.id}:${app.stage}:${app.status}`;
  const [selection, setSelection] = useState<{
    key: string;
    stage: ApplicationStage;
  } | null>(null);

  const selectedStage =
    selection?.key === selectionKey ? selection.stage : app.stage;
  const current = stageOrder.indexOf(app.stage);
  const selectedMeta = tx.workflow.stages[selectedStage];
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
          {tx.workflow.title}
        </Text>
        <Text size="xs" c="dimmed">
          {tx.workflow.stepOf(current + 1, stageOrder.length)} · {waitingLabel[app.waitingOn]}
        </Text>
      </Group>
      <ol
        className={classes.workflowGrid}
        aria-label={tx.workflow.stepsLabel}
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
                  <strong>{tx.workflow.stages[stage].label}</strong>
                  <small>{tx.workflow.stages[stage].short}</small>
                </span>
              </Button>
            </li>
          );
        })}
      </ol>
      <div className={classes.workflowDetail} aria-live="polite">
        <div>
          <Text size="xs" fw={700}>
            {tx.workflow.stages[selectedStage].label}
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

const sourceIcon = {
  egrul: IconBuildingBank,
  fns: IconReceiptTax,
  bki: IconUserSearch,
};

const stateView: Record<
  CheckState,
  { icon: typeof IconCircleCheck; tone: string }
> = {
  passed: { icon: IconCircleCheck, tone: "success" },
  pending: { icon: IconClockHour4, tone: "warning" },
  warning: { icon: IconAlertCircle, tone: "warning" },
  failed: { icon: IconCircleX, tone: "danger" },
  unavailable: { icon: IconCircleX, tone: "danger" },
};

/** Результаты проверок: источник, итог словами, время ответа. */
export function CheckResults({
  app,
  employee,
}: {
  app: Application;
  employee: Employee;
}) {
  const tx = backofficeText(i18n.defaultLocale);
  if (app.checks.length === 0) {
    return (
      <StateBlock kind="empty" title={tx.checks.emptyTitle}>
        {tx.checks.emptyText}
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
              {tx.checks.source[c.source]}
            </Text>
            <span className={classes.checkState} data-tone={view.tone}>
              <view.icon size={16} stroke={1.75} aria-hidden />
              <span>{c.state === "pending" ? tx.checks.state[c.state] : c.summary}</span>
            </span>
            <Text size="xs" c="dimmed" className={classes.checkTime}>
              {c.respondedAt ? formatDateTimeFull(c.respondedAt) : tx.checks.noResponse}
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
  const tx = backofficeText(i18n.defaultLocale);
  return (
    <section className={classes.risk} aria-labelledby={`risk-${app.id}`}>
      <Text id={`risk-${app.id}`} size="sm" fw={600}>
        {tx.risk.title}
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
            </Text>{" "}{tx.risk.scoreOf}
          </Text>
        </div>
      ) : (
        <Text size="sm" c="dimmed">
          {app.waitingOn === "system"
            ? tx.risk.waitingScore
            : tx.risk.noScore}
        </Text>
      )}
      {app.decision && (
        <div className={classes.reason}>
          <Text size="xs" fw={600}>
            {tx.risk.recommendation}: {recommendationLabel[app.decision.recommendation]}
          </Text>
          <Text size="xs">{app.decision.explanation}</Text>
        </div>
      )}
      {app.waitingOn === "employee" && (
        <div className={classes.reason}>
          <Text size="xs" fw={600}>
            {tx.risk.blocker}
          </Text>
          <Text size="xs">{app.blocker}</Text>
        </div>
      )}
      <Group gap="sm" wrap="nowrap" align="flex-start">
        <Alfi state={managerAlfiState(app)} size={40} />
        <Stack gap={2}>
          <Text size="sm" fw={600}>
            {tx.risk.alfi}
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
  const tx = backofficeText(i18n.defaultLocale);
  if (app.waitingOn === "system") {
    return tx.risk.systemChecking;
  }
  if (app.status === "rejected") {
    return app.rejectReason
      ? tx.risk.rejectedWithReason(rejectReasonLabel[app.rejectReason])
      : tx.risk.rejected;
  }
  if (app.status === "disbursed") {
    return tx.risk.disbursed;
  }
  if (app.status === "needs_client") {
    const items = app.requestedInfo.slice(0, 2).join(", ").toLowerCase();
    return tx.risk.needsClient(items);
  }
  if (app.status === "counter_offer") {
    if (app.offer) {
      return tx.risk.counterOffer(
        formatRub(app.offer.amount),
        formatMonths(app.offer.termMonths),
        app.offer.ratePct,
      );
    }
    return tx.risk.counterOfferWaiting;
  }
  if (app.status === "approved") {
    return tx.risk.approved;
  }
  if (app.decision) {
    return tx.risk.recommendationHint(recommendationLabel[app.decision.recommendation]);
  }
  return app.blocker;
}

/** Что уже решено: условия, запрос клиенту или причина отказа. */
export function Outcome({ app }: { app: Application }) {
  const tx = backofficeText(i18n.defaultLocale);
  if (app.status === "needs_client" && app.requestedInfo.length > 0) {
    return (
      <Stack gap={4}>
        <Text size="sm" fw={600}>
          {tx.outcome.requested}
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
          {tx.outcome.rejectionReason}{" "}
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
            ? tx.outcome.offered
            : tx.outcome.approved}
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
  const tx = backofficeText(i18n.defaultLocale);
  const rows: [string, string][] = [
    [tx.outcome.data.purpose, purposeLabel(request.purpose)],
    [tx.outcome.data.director, applicant.director],
    [tx.outcome.data.region, applicant.region],
    [tx.outcome.data.registeredAt, formatDate(applicant.registeredAt)],
    [
      tx.outcome.data.revenue,
      tx.outcome.data.revenueValue(formatRub(applicant.annualRevenue)),
    ],
    [tx.outcome.data.assignee, assignee],
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
        {tx.outcome.productRules}
      </Anchor>
    </Stack>
  );
}
