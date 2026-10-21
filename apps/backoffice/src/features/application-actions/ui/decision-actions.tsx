"use client";

import {
  Alert,
  Button,
  Checkbox,
  Group,
  Menu,
  Modal,
  NumberInput,
  Select,
  Stack,
  Text,
  TextInput,
  Textarea,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconAlertCircle, IconChevronDown } from "@tabler/icons-react";
import { useState } from "react";

import type {
  Application,
  CreditProduct,
  CreditProductId,
  Employee,
  EmployeeAction,
  RejectReason,
} from "@repo/contracts/application";
import { AmountInput } from "@repo/ui/amount-input";

import { productLabel, useApplicationAction } from "@/entities/application";
import { useEmployees } from "@/entities/employee";
import { rejectReasonLabel } from "@/shared/api/arm";
import { amountError, formatRub } from "@/shared/lib/money";

type Dialog = "approve" | "counter" | "request" | "reject" | null;

const recommendedDialog = {
  approve: "approve",
  counter_offer: "counter",
  request_info: "request",
  reject: "reject",
} as const;

const buttonLabel = {
  approve: "Одобрить как в заявке",
  counter: "Предложить другие условия",
  request: "Запросить документы",
  reject: "Отказать",
};

const DOCUMENTS = [
  "Справка об отсутствии налоговой задолженности",
  "Выписка по расчётному счёту за 6 месяцев",
  "Бухгалтерская отчётность за последний год",
  "Договор с покупателем под цель кредита",
];

/** Действия сотрудника на этапе решения. Каждое меняет статус и пишется в журнал. */
export function DecisionActions({
  app,
  employee,
  products,
}: {
  app: Application;
  employee: Employee;
  products: CreditProduct[];
}) {
  const [dialog, setDialog] = useState<Dialog>(null);
  const mutation = useApplicationAction(app.id, employee.id);
  const employees = useEmployees();

  const canDecide = app.stage === "decision" && app.waitingOn === "employee";
  const approveAmount = app.request.amount;
  const overLimit = approveAmount > employee.approvalLimit;
  const recommended =
    recommendedDialog[app.decision?.recommendation ?? "approve"];
  const order: Exclude<Dialog, null>[] = [
    recommended,
    ...(["approve", "counter", "request", "reject"] as const).filter(
      (k) => k !== recommended,
    ),
  ];

  function open(next: Dialog) {
    mutation.reset();
    setDialog(next);
  }
  const lead = employees.data?.find(
    (e) => e.role === "lead" && e.id !== employee.id,
  );

  function run(action: EmployeeAction, done: string) {
    mutation.mutate(action, {
      onSuccess: () => {
        setDialog(null);
        notifications.show({ message: done, withBorder: true });
      },
    });
  }

  const others = (employees.data ?? []).filter((e) => e.id !== app.assigneeId);

  return (
    <Stack gap="sm">
      {app.assigneeId !== employee.id && app.waitingOn !== "nobody" && (
        <Button
          variant="default"
          loading={mutation.isPending && mutation.variables?.type === "assign"}
          onClick={() =>
            run(
              { type: "assign", assigneeId: employee.id },
              "Заявка у вас в работе",
            )
          }
        >
          Взять в работу
        </Button>
      )}

      {canDecide ? (
        <>
          {overLimit && (
            <Alert
              variant="light"
              color="amber"
              icon={<IconAlertCircle size={18} aria-hidden />}
              title="Выше вашего лимита"
            >
              Одобрить {formatRub(approveAmount)} может руководитель: ваш лимит{" "}
              {formatRub(employee.approvalLimit)}.
              {lead && (
                <Button
                  mt="xs"
                  size="xs"
                  variant="default"
                  display="block"
                  onClick={() =>
                    run(
                      { type: "assign", assigneeId: lead.id },
                      `Передано: ${lead.name}`,
                    )
                  }
                >
                  Передать руководителю
                </Button>
              )}
            </Alert>
          )}
          <Stack gap="xs">
            {order.map((key) => (
              <Button
                key={key}
                variant={key === recommended ? "filled" : "default"}
                disabled={key === "approve" && overLimit}
                onClick={() => open(key)}
              >
                {buttonLabel[key]}
              </Button>
            ))}
          </Stack>
        </>
      ) : (
        <Text size="sm" c="dimmed">
          {app.waitingOn === "system"
            ? "Проверки идут автоматически. Решение станет доступно после рекомендации."
            : app.waitingOn === "client"
              ? "Ход за клиентом. Заявка вернётся к вам, когда он ответит."
              : app.waitingOn === "nobody"
                ? "Решение принято, действий не требуется."
                : "Сначала повторите запрос в источник, который не ответил."}
        </Text>
      )}

      {others.length > 0 && app.waitingOn !== "nobody" && (
        <Menu position="bottom-start" withinPortal>
          <Menu.Target>
            <Button
              variant="subtle"
              size="xs"
              rightSection={<IconChevronDown size={14} aria-hidden />}
              style={{ alignSelf: "flex-start" }}
            >
              Передать другому сотруднику
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            {others.map((e) => (
              <Menu.Item
                key={e.id}
                onClick={() =>
                  run(
                    { type: "assign", assigneeId: e.id },
                    `Передано: ${e.name}`,
                  )
                }
              >
                {e.name}
              </Menu.Item>
            ))}
          </Menu.Dropdown>
        </Menu>
      )}

      {dialog === "approve" && (
        <ApproveDialog
          opened
          app={app}
          pending={mutation.isPending}
          error={mutation.error}
          onClose={() => setDialog(null)}
          onSubmit={(comment) =>
            run(
              { type: "approve", comment },
              "Заявка одобрена, клиент получит договор",
            )
          }
        />
      )}
      {dialog === "counter" && (
        <CounterDialog
          opened
          app={app}
          products={products}
          pending={mutation.isPending}
          error={mutation.error}
          onClose={() => setDialog(null)}
          onSubmit={(action) =>
            run(action, "Встречное предложение отправлено клиенту")
          }
        />
      )}
      {dialog === "request" && (
        <RequestDialog
          opened
          app={app}
          pending={mutation.isPending}
          error={mutation.error}
          onClose={() => setDialog(null)}
          onSubmit={(action) => run(action, "Запрос отправлен клиенту")}
        />
      )}
      {dialog === "reject" && (
        <RejectDialog
          opened
          app={app}
          pending={mutation.isPending}
          error={mutation.error}
          onClose={() => setDialog(null)}
          onSubmit={(action) => run(action, "Отказ зафиксирован")}
        />
      )}
    </Stack>
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

function ApproveDialog({
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

function CounterDialog({
  opened,
  app,
  products,
  pending,
  error,
  onClose,
  onSubmit,
}: DialogProps & {
  products: CreditProduct[];
  onSubmit: (action: EmployeeAction) => void;
}) {
  const base = app.decision?.terms ?? {
    productId: app.request.productId,
    amount: app.request.amount,
    termMonths: app.request.termMonths,
    ratePct: products.find((p) => p.id === app.request.productId)?.ratePct ?? 0,
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
          if (amountInvalid || termInvalid || !comment.trim()) return;
          onSubmit({
            type: "counter_offer",
            terms: {
              productId,
              amount: Number(amount),
              termMonths: termNum,
              ratePct: Number(rate),
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
            <Button type="submit" loading={pending}>
              Отправить клиенту
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

function RequestDialog({
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

function RejectDialog({
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
            <Button type="submit" color="danger" loading={pending}>
              Отказать
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
