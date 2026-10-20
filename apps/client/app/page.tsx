import type { CompanyCheckResponse } from "@repo/contracts";
import { Card } from "@repo/ui/card";
import { StatusBadge } from "@repo/ui/status-badge";
import { apiGet } from "../lib/api";

export const dynamic = "force-dynamic";

const DEMO_INN = "7707083893";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ inn?: string }>;
}) {
  const { inn } = await searchParams;

  let check: CompanyCheckResponse | null = null;
  let error: string | null = null;
  if (inn) {
    try {
      check = await apiGet<CompanyCheckResponse>(
        `/v1/companies/${encodeURIComponent(inn)}/check`,
      );
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }

  return (
    <main>
      <h1>Кабинет предпринимателя</h1>
      <p>Каркас. Сквозная ручка: client → api → mocks + scoring.</p>

      <form>
        <label>
          ИНН{" "}
          <input name="inn" defaultValue={inn ?? DEMO_INN} pattern="\d{10,12}" />
        </label>{" "}
        <button type="submit">Проверить</button>
      </form>

      {error && (
        <Card title="Ошибка">
          <StatusBadge ok={false} label={error} />
        </Card>
      )}

      {check && (
        <Card title={`Результат для ИНН ${check.inn}`}>
          <pre>{JSON.stringify(check, null, 2)}</pre>
        </Card>
      )}
    </main>
  );
}
