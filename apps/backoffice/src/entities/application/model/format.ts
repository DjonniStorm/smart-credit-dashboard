const dateTime = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});
const time = new Intl.DateTimeFormat("ru-RU", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

/** 21.10, 14:35 */
export function formatDateTime(iso: string): string {
  return dateTime.format(new Date(iso));
}

/** 14:35:07 */
export function formatTime(iso: string): string {
  return time.format(new Date(iso));
}

/** Сколько заявка ждёт: «4 мин», «3 ч», «2 дн.» */
export function formatAge(fromIso: string, now = Date.now()): string {
  const min = Math.max(0, Math.round((now - Date.parse(fromIso)) / 60_000));
  if (min < 1) return "меньше минуты";
  if (min < 60) return `${min} мин`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} ч`;
  return `${Math.floor(h / 24)} дн.`;
}

/** 640 мс, 2,4 с */
export function formatMs(ms: number): string {
  if (ms < 1000) return `${ms} мс`;
  return `${(ms / 1000).toLocaleString("ru-RU", { maximumFractionDigits: 1 })} с`;
}

const dateFull = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const dateTimeFull = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** 24.10.2024 */
export function formatDate(iso: string): string {
  return dateFull.format(new Date(iso));
}

/** 24.10.2024, 10:24 */
export function formatDateTimeFull(iso: string): string {
  return dateTimeFull.format(new Date(iso));
}

/** 1 месяц, 3 месяца, 18 месяцев */
export function formatMonths(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  const word =
    mod10 === 1 && mod100 !== 11
      ? "месяц"
      : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
        ? "месяца"
        : "месяцев";
  return `${n} ${word}`;
}
