import { healthControllerCheckOptions, withStableQueryKey } from "@repo/sdk";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { serverClient } from "../lib/api.server";
import { makeQueryClient } from "../lib/query-client";
import { HealthStatus } from "./health-status";

export const dynamic = "force-dynamic";

export default async function Home() {
  const queryClient = makeQueryClient();

  try {
    await queryClient.prefetchQuery(
      withStableQueryKey(
        healthControllerCheckOptions({
          client: serverClient,
        }),
      ),
    );
  } catch {
    // Ошибка останется в кэше Query и отрисуется на клиенте.
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <main>
        <h1>АРМ сотрудника банка</h1>
        <p>Каркас. Здесь будет очередь заявок и карточка решения.</p>
        <HealthStatus />
      </main>
    </HydrationBoundary>
  );
}
