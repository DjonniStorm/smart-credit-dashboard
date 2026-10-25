import assert from "node:assert/strict";
import test from "node:test";

import { Locale, financingText, i18n } from "@repo/i18n";

test("для каждой поддерживаемой локали есть полный словарь финансирования", () => {
  const ru = financingText(Locale.Ru);
  for (const locale of i18n.locales) {
    const dictionary = financingText(locale);
    assert.deepEqual(Object.keys(dictionary).sort(), Object.keys(ru).sort());
    assert.deepEqual(
      Object.keys(dictionary.filters).sort(),
      Object.keys(ru.filters).sort(),
    );
  }
});

test("locale действительно выбирает язык, включая динамические подписи", () => {
  const ru = financingText(Locale.Ru);
  const en = financingText(Locale.En);
  assert.equal(ru.title, "Финансирование бизнеса");
  assert.equal(en.title, "Business financing");
  assert.equal(en.months(1), "1 month");
  assert.equal(en.months(12), "12 months");
  assert.equal(ru.months(12), "12 мес.");
  assert.equal(en.choose("SC-1"), "Select application SC-1");
  assert.equal(en.otherActions(2), "2 more require your attention");
  for (const key of Object.keys(ru) as (keyof typeof ru)[]) {
    if (typeof ru[key] === "string") {
      assert.notEqual(en[key], ru[key], key);
    }
  }
});

test("неизвестная локаль использует явный fallback на русский", () => {
  assert.equal(financingText("unknown" as Locale), financingText(Locale.Ru));
});
