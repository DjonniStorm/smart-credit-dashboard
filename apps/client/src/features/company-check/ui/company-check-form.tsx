"use client";

import { useSearchParams } from "next/navigation";

const DEMO_INN = "7707083893";

export function CompanyCheckForm() {
  const inn = useSearchParams().get("inn") ?? DEMO_INN;

  return (
    <form>
      <label>
        ИНН <input name="inn" defaultValue={inn} pattern="\d{10,12}" />
      </label>{" "}
      <button type="submit">Проверить</button>
    </form>
  );
}
