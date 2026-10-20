"use client";

import { useSearchParams } from "next/navigation";

import { Message, i18n, t } from "@repo/i18n";

const DEMO_INN = "7707083893";

export function CompanyCheckForm() {
  const inn = useSearchParams().get("inn") ?? DEMO_INN;

  return (
    <form>
      <label>
        {t(i18n.defaultLocale, Message.InnLabel)}{" "}
        <input name="inn" defaultValue={inn} pattern="\d{10,12}" />
      </label>{" "}
      <button type="submit">{t(i18n.defaultLocale, Message.InnSubmit)}</button>
    </form>
  );
}
