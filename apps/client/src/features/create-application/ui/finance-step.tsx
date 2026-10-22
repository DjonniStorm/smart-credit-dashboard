import {
  NumberInput,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";

import type { Financials } from "@repo/contracts/cabinet";
import { formatRub } from "@repo/ui/money";

import { formatDate, lx, tx } from "@/shared/i18n";

import classes from "./application-wizard.module.css";

const t = lx.wizard;
const below = ["label", "input", "description", "error"] as const;

export type FinancialsForm = Record<keyof Financials, number | string>;

const fields: {
  key: keyof Financials;
  label: string;
  hint: string;
  money: boolean;
}[] = [
  {
    key: "avgMonthlyTurnover",
    label: t.turnover,
    hint: t.turnoverHint,
    money: true,
  },
  {
    key: "revenueLastYear",
    label: t.revenue,
    hint: t.revenueHint,
    money: true,
  },
  { key: "monthlyDebtPayments", label: t.debt, hint: t.debtHint, money: true },
  {
    key: "employees",
    label: tx.wizard.employees,
    hint: t.employeesHint,
    money: false,
  },
];

const plural = (n: number, one: string, few: string, many: string) => {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
};

/** «6 лет 7 месяцев» от даты регистрации до сегодня. */
function businessAge(registeredAt: string, now = new Date()) {
  const from = new Date(registeredAt);
  const months =
    (now.getFullYear() - from.getFullYear()) * 12 +
    (now.getMonth() - from.getMonth());
  const y = Math.floor(months / 12);
  const m = months % 12;
  const years = y ? `${y} ${plural(y, "год", "года", "лет")}` : "";
  const rest = m ? `${m} ${plural(m, "месяц", "месяца", "месяцев")}` : "";
  return [years, rest].filter(Boolean).join(" ") || "меньше месяца";
}

const share = (part: number, whole: number) =>
  whole > 0 ? Math.round((part / whole) * 100) : 0;

/** Доля оборота: платежи сейчас, новый платёж, остаток. Только из полей анкеты. */
function DebtLoad({
  financials,
  payment,
}: {
  financials: FinancialsForm;
  payment: number | null;
}) {
  const l = t.load;
  const turnover = Number(financials.avgMonthlyTurnover) || 0;
  const current = Number(financials.monthlyDebtPayments) || 0;
  const next = payment ?? 0;
  const currentPct = Math.min(100, share(current, turnover));
  const nextPct = Math.min(100 - currentPct, share(next, turnover));
  const freePct = 100 - currentPct - nextPct;
  const total = share(current + next, turnover);

  return (
    <section aria-labelledby="debt-load" className={classes.load}>
      <div className={classes.loadMain}>
        <Title order={3} id="debt-load">
          {l.title}
        </Title>
        <Text size="sm" c="dimmed" mb="md">
          {l.lead}
        </Text>
        <div
          className={classes.loadBar}
          role="img"
          aria-label={l.chartLabel(
            `${currentPct} %`,
            `${nextPct} %`,
            `${freePct} %`,
          )}
        >
          <span
            className={classes.loadCurrent}
            style={{ width: `${currentPct}%` }}
          />
          <span className={classes.loadNext} style={{ width: `${nextPct}%` }} />
        </div>
        <ul className={classes.legend}>
          <li>
            <span className={classes.swatchCurrent} aria-hidden />
            {l.current}: {formatRub(current)}
          </li>
          <li>
            <span className={classes.swatchNext} aria-hidden />
            {l.next}: {payment === null ? "—" : formatRub(next)}
          </li>
          <li>
            <span className={classes.swatchFree} aria-hidden />
            {l.free}: {formatRub(Math.max(0, turnover - current - next))}
          </li>
        </ul>
        {payment === null && (
          <Text size="sm" c="dimmed" mt="xs">
            {l.noProduct}
          </Text>
        )}
      </div>
      <dl className={classes.loadStats}>
        <div>
          <dt>{l.share}</dt>
          <dd className={classes.midValue}>{turnover ? `${total} %` : "—"}</dd>
          <dd className={classes.statNote}>
            {l.shareNow(`${share(current, turnover)} %`)}
          </dd>
        </div>
        <div>
          <dt>{l.turnover}</dt>
          <dd>{formatRub(turnover)}</dd>
        </div>
      </dl>
    </section>
  );
}

/** Шаг «Финансы»: поля из контракта, срок деятельности из ЕГРЮЛ, нагрузка на оборот. */
export function FinanceStep({
  financials,
  registeredAt,
  payment,
  errors,
  onChange,
}: {
  financials: FinancialsForm;
  registeredAt: string;
  payment: number | null;
  errors: Partial<Record<string, string>>;
  onChange: (next: FinancialsForm) => void;
}) {
  return (
    <Stack gap="xl">
      <SimpleGrid
        cols={{ base: 1, xs: 2, lg: 3 }}
        spacing="lg"
        verticalSpacing="lg"
      >
        {fields.map((f) => (
          <NumberInput
            key={f.key}
            label={f.label}
            description={f.hint}
            inputWrapperOrder={[...below]}
            suffix={f.money ? " ₽" : ""}
            min={0}
            value={financials[f.key]}
            onChange={(v) => onChange({ ...financials, [f.key]: v })}
            error={errors[f.key]}
            hideControls
            inputMode="numeric"
          />
        ))}
        <TextInput
          label={t.age}
          description={t.ageHint(formatDate(registeredAt))}
          inputWrapperOrder={[...below]}
          value={businessAge(registeredAt)}
          readOnly
          variant="filled"
        />
      </SimpleGrid>
      <DebtLoad financials={financials} payment={payment} />
    </Stack>
  );
}
