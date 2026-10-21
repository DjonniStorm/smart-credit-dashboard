// Копия formatRub и amountError из @repo/ui/money: пакет ui экспортирует только .tsx.
// Когда в packages/ui появится экспорт "./money", импортировать оттуда.
const rub = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0,
});
const plain = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });

/** 1 500 000 ₽ */
export function formatRub(value: number): string {
  return rub.format(value);
}

/** Ошибка суммы словами и с числом из лимита, или null. */
export function amountError(
  value: number | string | undefined,
  min: number,
  max: number,
): string | null {
  const n =
    typeof value === "number"
      ? value
      : Number(String(value ?? "").replace(/\s/g, ""));
  if (!value && value !== 0) return "Укажите сумму";
  if (Number.isNaN(n)) return "Укажите сумму цифрами";
  if (n < min) return `Сумма должна быть от ${plain.format(min)} ₽`;
  if (n > max) return `Сумма должна быть не больше ${plain.format(max)} ₽`;
  return null;
}
