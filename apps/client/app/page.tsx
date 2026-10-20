import {
  companiesControllerCheckOptions,
  withStableQueryKey,
} from "@repo/sdk";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { serverClient } from "../lib/api.server";
import { makeQueryClient } from "../lib/query-client";
import { CompanyCheckResult } from "./company-check-result";

export const dynamic = "force-dynamic";

const DEMO_INN = "7707083893";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ inn?: string }>;
}) {
  const { inn } = await searchParams;
  const queryClient = makeQueryClient();

  if (inn) {
    try {
      await queryClient.prefetchQuery(
        withStableQueryKey(
          companiesControllerCheckOptions({
            client: serverClient,
            path: { inn },
          }),
        ),
      );
    } catch {
      // Ошибка останется в кэше Query и отрисуется на клиенте.
    }
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <main>
        <h1>Кабинет предпринимателя</h1>
        <p>Каркас. Сквозная ручка: client → api → mocks + scoring.</p>

        <form>
          <label>
            ИНН{" "}
            <input
              name="inn"
              defaultValue={inn ?? DEMO_INN}
              pattern="\d{10,12}"
            />
          </label>{" "}
          <button type="submit">Проверить</button>
        </form>

        {inn ? <CompanyCheckResult inn={inn} /> : null}
      </main>
    </HydrationBoundary>
  );
}
