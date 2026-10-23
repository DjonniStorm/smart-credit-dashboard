import { en } from "./dictionaries/en.js";
import { ru } from "./dictionaries/ru.js";
import { Locale } from "./locale.js";
import { Message } from "./message.js";

const dictionaries: Record<Locale, Record<Message, string>> = {
  [Locale.Ru]: ru,
  [Locale.En]: en,
};

export type MessageVars = Record<string, string | number>;

function dictionary(locale: Locale): Record<Message, string> {
  return dictionaries[locale] ?? ru;
}

export function t(locale: Locale, key: Message, vars?: MessageVars): string {
  const text = dictionary(locale)[key] ?? key;
  if (!vars) {
    return text;
  }
  return text.replace(/\{(\w+)\}/g, (full: string, name: string) => {
    const value = vars[name];
    return value === undefined ? full : String(value);
  });
}

export function createTranslator(locale: Locale) {
  return (key: Message, vars?: MessageVars) => t(locale, key, vars);
}
