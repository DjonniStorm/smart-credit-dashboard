"use client";

import {
  Alert,
  Button,
  Checkbox,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  Text,
  TextInput,
  Textarea,
} from "@mantine/core";
import { IconAlertCircle, IconCircleX } from "@tabler/icons-react";
import { useState } from "react";

import type {
  Application,
  ApplicationComment,
  CreditProductId,
  Employee,
  EmployeeAction,
  RejectReason,
} from "@repo/contracts/application";
import { AmountInput } from "@repo/ui/amount-input";

import { productLabel } from "@/entities/application";
import { type ArmProduct, rejectReasonLabel } from "@/shared/api/arm";
import { amountError, formatRub } from "@/shared/lib/money";

const DOCUMENTS = [
  "Справка об отсутствии налоговой задолженности",
  "Выписка по расчётному счёту за 6 месяцев",
  "Бухгалтерская отчётность за последний год",
  "Договор с покупателем под цель кредита",
];

export function RejectIcon() {
  return <IconCircleX size={16} color="var(--kk-danger)" aria-hidden />;
}

export function HoldDialog({
  opened,
  pending,
  error,
  onClose,
  kind,
  onSubmit,
}: Pick<DialogProps, "opened" | "pending" | "error" | "onClose"> & {
  kind: "pause" | "block";
  onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const title =
    kind === "pause" ? "Поставить на паузу" : "Заблокировать заявку";
  return (
    <Modal opened={opened} onClose={onClose} title={title} size="sm">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (reason.trim()) onSubmit(reason.trim());
        }}
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Причина попадёт в аудит заявки. Бизнес-статус и история переходов
            сохраняются.
          </Text>
          <Textarea
            label="Причина"
            placeholder={
              kind === "pause"
                ? "Например, ждём уточнение от клиента"
                : "Например, требуется ручная проверка риска"
            }
            value={reason}
            onChange={(e) => setReason(e.currentTarget.value)}
            required
            autosize
            minRows={3}
          />
          <ErrorLine error={error} />
          <Group justify="flex-end" gap="xs">
            <Button variant="default" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" loading={pending}>
              {title}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

export function CommentDialog({
  opened,
  pending,
  error,
  onClose,
  onSubmit,
}: Pick<DialogProps, "opened" | "pending" | "error" | "onClose"> & {
  onSubmit: (action: EmployeeAction) => void;
}) {
  const [visibility, setVisibility] =
    useState<ApplicationComment["visibility"]>("internal");
  const [body, setBody] = useState("");
  const [touched, setTouched] = useState(false);
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Добавить комментарий"
      size="md"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setTouched(true);
          if (!body.trim()) return;
          onSubmit({ type: "comment", visibility, body: body.trim() });
        }}
      >
        <Stack gap="md">
          <Select
            label="Видимость"
            description="Определяет, кто увидит запись в истории заявки"
            value={visibility}
            onChange={(value) =>
              value && setVisibility(value as ApplicationComment["visibility"])
            }
            data={[
              { value: "internal", label: "Внутренний комментарий" },
              { value: "client", label: "Комментарий клиенту" },
              { value: "handoff", label: "Комментарий для передачи" },
            ]}
            allowDeselect={false}
          />
          <Textarea
            label="Текст"
            placeholder="Зафиксируйте важное наблюдение или следующий шаг"
            value={body}
            onChange={(e) => setBody(e.currentTarget.value)}
            error={touched && !body.trim() ? "Напишите комментарий" : null}
            required
            autosize
            minRows={4}
            maxLength={2000}
          />
          <ErrorLine error={error} />
          <Group justify="flex-end" gap="xs">
            <Button variant="default" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" loading={pending}>
              Добавить
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

export function HandoffDialog({
  opened,
  employees,
  pending,
  error,
  onClose,
  onSubmit,
}: Pick<DialogProps, "opened" | "pending" | "error" | "onClose"> & {
  employees: Employee[];
  onSubmit: (action: EmployeeAction) => void;
}) {
  const [assigneeId, setAssigneeId] = useState<string | null>(
    employees[0]?.id ?? null,
  );
  const [summary, setSummary] = useState("");
  const [facts, setFacts] = useState("");
  const [questions, setQuestions] = useState("");
  const [requested, setRequested] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [touched, setTouched] = useState(false);
  const lines = (value: string) =>
    value
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  return (
    <Modal opened={opened} onClose={onClose} title="Передать заявку" size="lg">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setTouched(true);
          if (!assigneeId || !summary.trim() || !nextStep.trim()) return;
          onSubmit({
            type: "handoff",
            assigneeId,
            summary: summary.trim(),
            verifiedFacts: lines(facts),
            openQuestions: lines(questions),
            requestedItems: lines(requested),
            nextStep: nextStep.trim(),
          });
        }}
      >
        <Stack gap="md">
          <Select
            label="Кому передать"
            value={assigneeId}
            onChange={setAssigneeId}
            data={employees.map((e) => ({
              value: e.id,
              label: `${e.name} · ${e.role}`,
            }))}
            allowDeselect={false}
            searchable
          />
          <Textarea
            label="Резюме для коллеги"
            value={summary}
            onChange={(e) => setSummary(e.currentTarget.value)}
            error={touched && !summary.trim() ? "Добавьте резюме" : null}
            required
            autosize
            minRows={3}
          />
          <Group grow align="flex-start">
            <Textarea
              label="Проверенные факты"
              description="Одна запись на строку"
              value={facts}
              onChange={(e) => setFacts(e.currentTarget.value)}
              autosize
              minRows={3}
            />
            <Textarea
              label="Открытые вопросы"
              description="Одна запись на строку"
              value={questions}
              onChange={(e) => setQuestions(e.currentTarget.value)}
              autosize
              minRows={3}
            />
          </Group>
          <Textarea
            label="Что запросить"
            description="Одна запись на строку"
            value={requested}
            onChange={(e) => setRequested(e.currentTarget.value)}
            autosize
            minRows={2}
          />
          <Textarea
            label="Следующий шаг"
            value={nextStep}
            onChange={(e) => setNextStep(e.currentTarget.value)}
            error={touched && !nextStep.trim() ? "Опишите следующий шаг" : null}
            required
            autosize
            minRows={2}
          />
          <ErrorLine error={error} />
          <Group justify="flex-end" gap="xs">
            <Button variant="default" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" loading={pending}>
              Передать
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

export function CancelDialog({
  opened,
  pending,
  error,
  onClose,
  onSubmit,
}: Pick<DialogProps, "opened" | "pending" | "error" | "onClose"> & {
  onSubmit: (action: EmployeeAction) => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <Modal opened={opened} onClose={onClose} title="Отменить заявку" size="sm">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (reason.trim())
            onSubmit({ type: "cancel", reason: reason.trim() });
        }}
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Отмена завершит обработку заявки и попадёт в аудит.
          </Text>
          <Textarea
            label="Причина отмены"
            value={reason}
            onChange={(e) => setReason(e.currentTarget.value)}
            required
            autosize
            minRows={3}
          />
          <ErrorLine error={error} />
          <Group justify="flex-end" gap="xs">
            <Button variant="default" onClick={onClose}>
              Назад
            </Button>
            <Button type="submit" color="red" loading={pending}>
              Отменить заявку
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

interface DialogProps {
  opened: boolean;
  app: Application;
  pending: boolean;
  error: Error | null;
  onClose: () => void;
}

function ErrorLine({ error }: { error: Error | null }) {
  if (!error) return null;
  return (
    <Alert
      color="danger"
      variant="light"
      icon={<IconAlertCircle size={18} aria-hidden />}
      role="alert"
    >
      {error.message}
    </Alert>
  );
}

export function ApproveDialog({
  opened,
  app,
  pending,
  error,
  onClose,
  onSubmit,
}: DialogProps & { onSubmit: (comment: string) => void }) {
  const [comment, setComment] = useState("");
  const recommendedOther = app.decision?.recommendation !== "approve";
  return (
    <Modal opened={opened} onClose={onClose} title="Одобрить заявку" size="md">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(comment);
        }}
      >
        <Stack gap="md">
          <Text>
            {productLabel[app.request.productId]}:{" "}
            <Text span fw={600}>
              {formatRub(app.request.amount)}
            </Text>{" "}
            на {app.request.termMonths} мес., как просил клиент.
          </Text>
          {recommendedOther && app.decision && (
            <Text size="sm" c="dimmed">
              Система рекомендовала другое: {app.decision.explanation} Объясните
              решение в комментарии.
            </Text>
          )}
          <Textarea
            label="Комментарий"
            description="Попадёт в журнал заявки"
            value={comment}
            onChange={(e) => setComment(e.currentTarget.value)}
            required={recommendedOther}
            autosize
            minRows={2}
          />
          <ErrorLine error={error} />
          <Group justify="flex-end" gap="xs">
            <Button variant="default" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" loading={pending}>
              Одобрить
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

export function CounterDialog({
  opened,
  app,
  products,
  pending,
  error,
  onClose,
  onSubmit,
}: DialogProps & {
  products: ArmProduct[];
  onSubmit: (action: EmployeeAction) => void;
}) {
  const requestedProduct = products.find((p) => p.id === app.request.productId);
  const base = app.decision?.terms ?? {
    productId: app.request.productId,
    amount: app.request.amount,
    termMonths: app.request.termMonths,
    ratePct: requestedProduct?.ratePct ?? "",
  };
  const [productId, setProductId] = useState<CreditProductId>(base.productId);
  const [amount, setAmount] = useState<number | string>(base.amount);
  const [term, setTerm] = useState<number | string>(base.termMonths);
  const [rate, setRate] = useState<number | string>(base.ratePct);
  const [comment, setComment] = useState("");
  const [touched, setTouched] = useState(false);

  const product = products.find((p) => p.id === productId);
  const amountInvalid = product
    ? amountError(amount, product.minAmount, product.maxAmount)
    : null;
  const rateNum = Number(rate);
  const rateInvalid = !(rateNum > 0);
  const termNum = Number(term);
  const termInvalid =
    product &&
    (!termNum ||
      termNum < product.minTermMonths ||
      termNum > product.maxTermMonths);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Предложить другие условия"
      size="md"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setTouched(true);
          if (
            !product ||
            amountInvalid ||
            termInvalid ||
            rateInvalid ||
            !comment.trim()
          ) {
            return;
          }
          onSubmit({
            type: "counter_offer",
            terms: {
              productId,
              amount: Number(amount),
              termMonths: termNum,
              ratePct: rateNum,
            },
            comment: comment.trim(),
          });
        }}
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Клиент просил {formatRub(app.request.amount)} на{" "}
            {app.request.termMonths} мес. ({productLabel[app.request.productId]}
            ). Поля заполнены по рекомендации системы.
          </Text>
          <Select
            label="Продукт"
            data={products.map((p) => ({ value: p.id, label: p.name }))}
            value={productId}
            onChange={(v) => v && setProductId(v as CreditProductId)}
            allowDeselect={false}
          />
          {product && (
            <AmountInput
              label="Сумма"
              min={product.minAmount}
              max={product.maxAmount}
              value={amount}
              onChange={setAmount}
              onBlur={() => setTouched(true)}
              showError={touched}
            />
          )}
          <Group grow align="flex-start">
            <NumberInput
              label="Срок"
              suffix=" мес."
              value={term}
              onChange={setTerm}
              min={1}
              error={
                touched && termInvalid && product
                  ? `От ${product.minTermMonths} до ${product.maxTermMonths} мес.`
                  : null
              }
            />
            <NumberInput
              label="Ставка"
              suffix=" %"
              decimalScale={1}
              value={rate}
              onChange={setRate}
              min={1}
              max={60}
              error={
                touched && rateInvalid ? "Укажите ставку больше нуля" : null
              }
            />
          </Group>
          <Textarea
            label="Почему такие условия"
            description="Клиент увидит эту причину в кабинете"
            value={comment}
            onChange={(e) => setComment(e.currentTarget.value)}
            error={touched && !comment.trim() ? "Напишите причину" : null}
            autosize
            minRows={2}
          />
          <ErrorLine error={error} />
          <Group justify="flex-end" gap="xs">
            <Button variant="default" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" loading={pending} disabled={!product}>
              Отправить клиенту
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

export function RequestDialog({
  opened,
  app,
  pending,
  error,
  onClose,
  onSubmit,
}: DialogProps & { onSubmit: (action: EmployeeAction) => void }) {
  const suggested = app.decision?.rules.some(
    (r) => r.id === "tax_debt" && r.outcome !== "pass",
  )
    ? [DOCUMENTS[0]!]
    : [];
  const [items, setItems] = useState<string[]>(suggested);
  const [other, setOther] = useState("");
  const [comment, setComment] = useState("");
  const [touched, setTouched] = useState(false);
  const all = [...items, ...(other.trim() ? [other.trim()] : [])];

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Запросить у клиента"
      size="md"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setTouched(true);
          if (all.length === 0) return;
          onSubmit({
            type: "request_info",
            items: all,
            comment: comment.trim(),
          });
        }}
      >
        <Stack gap="md">
          <Checkbox.Group
            label="Что нужно от клиента"
            value={items}
            onChange={setItems}
            error={
              touched && all.length === 0 ? "Выберите хотя бы один пункт" : null
            }
          >
            <Stack gap="xs" mt="xs">
              {DOCUMENTS.map((d) => (
                <Checkbox key={d} value={d} label={d} />
              ))}
            </Stack>
          </Checkbox.Group>
          <TextInput
            label="Другое"
            placeholder="Например, пояснение по выручке"
            value={other}
            onChange={(e) => setOther(e.currentTarget.value)}
          />
          <Textarea
            label="Комментарий для клиента"
            value={comment}
            onChange={(e) => setComment(e.currentTarget.value)}
            autosize
            minRows={2}
          />
          <ErrorLine error={error} />
          <Group justify="flex-end" gap="xs">
            <Button variant="default" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" loading={pending}>
              Отправить запрос
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

export function RejectDialog({
  opened,
  app,
  pending,
  error,
  onClose,
  onSubmit,
}: DialogProps & { onSubmit: (action: EmployeeAction) => void }) {
  const failed = app.decision?.rules.find((r) => r.outcome === "fail")?.id;
  const guess: RejectReason =
    failed === "company_active"
      ? "company_inactive"
      : failed === "bki_overdue"
        ? "bki_overdue"
        : failed === "score" || failed === "business_age"
          ? "low_score"
          : "other";
  const [reason, setReason] = useState<RejectReason>(guess);
  const [comment, setComment] = useState("");
  const [touched, setTouched] = useState(false);

  return (
    <Modal opened={opened} onClose={onClose} title="Отказать" size="md">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setTouched(true);
          if (!comment.trim()) return;
          onSubmit({ type: "reject", reason, comment: comment.trim() });
        }}
      >
        <Stack gap="md">
          <Select
            label="Причина"
            data={Object.entries(rejectReasonLabel).map(([value, label]) => ({
              value,
              label,
            }))}
            value={reason}
            onChange={(v) => v && setReason(v as RejectReason)}
            allowDeselect={false}
          />
          <Textarea
            label="Пояснение"
            description="Клиент увидит причину отказа, пишите без внутренних терминов"
            value={comment}
            onChange={(e) => setComment(e.currentTarget.value)}
            error={touched && !comment.trim() ? "Напишите пояснение" : null}
            autosize
            minRows={2}
          />
          <ErrorLine error={error} />
          <Group justify="flex-end" gap="xs">
            <Button variant="default" onClick={onClose}>
              Отмена
            </Button>
            <Button
              type="submit"
              variant="default"
              leftSection={<RejectIcon />}
              loading={pending}
            >
              Отказать
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
