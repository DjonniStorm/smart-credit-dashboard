"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";

import type {
  Application,
  ClientResponse,
  EmployeeAction,
} from "@repo/contracts/application";
import type { ManagerReportQuery } from "@repo/contracts/reports";

import { armApi, armKeys } from "@/shared/api/arm";

/** Пока что-то идёт автоматически, опрашиваем чаще: проверки приходят сами. */
const liveInterval = (apps: Application[] | undefined) =>
  apps?.some((a) => a.waitingOn === "system") ? 1_500 : 15_000;

export function useApplications() {
  return useQuery({
    queryKey: armKeys.applications(),
    queryFn: () => armApi.listApplications(),
    staleTime: 0,
    refetchInterval: (q) => liveInterval(q.state.data),
  });
}

export function useApplication(id: string) {
  return useQuery({
    queryKey: armKeys.application(id),
    queryFn: () => armApi.getApplication(id),
    staleTime: 0,
    refetchInterval: (q) => liveInterval(q.state.data && [q.state.data]),
  });
}

export function useProducts() {
  return useQuery({
    queryKey: armKeys.products(),
    queryFn: () => armApi.listProducts(),
    staleTime: Infinity,
  });
}

export function useAutonomyPolicies() {
  return useQuery({
    queryKey: armKeys.autonomyPolicies(),
    queryFn: () => armApi.listAutonomyPolicies(),
    staleTime: 0,
  });
}

export function useAutonomyPolicyAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      productId,
      request,
    }: {
      productId: string;
      request: Parameters<typeof armApi.applyAutonomyPolicyAction>[1];
    }) => armApi.applyAutonomyPolicyAction(productId, request),
    onSuccess: (snapshot, variables) => {
      queryClient.setQueryData(
        armKeys.autonomyPolicy(variables.productId),
        snapshot,
      );
      void queryClient.invalidateQueries({
        queryKey: armKeys.autonomyPolicies(),
      });
      void queryClient.invalidateQueries({ queryKey: armKeys.managerReports() });
    },
  });
}

export function useAutonomyAudit(productId: string) {
  return useQuery({
    queryKey: armKeys.autonomyAudit(productId),
    queryFn: () => armApi.listAutonomyAudit(productId),
    staleTime: 0,
  });
}

export function useManagerReport(
  view: "overview" | "journal",
  query?: Partial<ManagerReportQuery>,
) {
  const searchParams = useSearchParams();
  const queryFromUrl: Partial<ManagerReportQuery> = {
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
    timezone:
      searchParams.get("timezone") ??
      Intl.DateTimeFormat().resolvedOptions().timeZone,
    view: (searchParams.get("view") as ManagerReportQuery["view"] | null) ?? undefined,
    bucket: (searchParams.get("bucket") as ManagerReportQuery["bucket"] | null) ?? undefined,
    cursor: searchParams.get("cursor") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    limit: parseLimit(searchParams.get("limit")),
    productIds: splitSearchValues(searchParams.get("product")) as ManagerReportQuery["productIds"],
    statuses: splitSearchValues(searchParams.get("status")) as ManagerReportQuery["statuses"],
    assigneeIds: splitSearchValues(searchParams.get("assignee")),
    stages: splitSearchValues(searchParams.get("stage")) as ManagerReportQuery["stages"],
    actorKinds: splitSearchValues(searchParams.get("actor")) as ManagerReportQuery["actorKinds"],
    recommendations: splitSearchValues(searchParams.get("recommendation")) as ManagerReportQuery["recommendations"],
    autonomyModes: splitSearchValues(searchParams.get("autonomy")) as ManagerReportQuery["autonomyModes"],
    autonomyDispositions: splitSearchValues(searchParams.get("autonomyDisposition")) as ManagerReportQuery["autonomyDispositions"],
    slaStates: splitSearchValues(searchParams.get("sla")) as ManagerReportQuery["slaStates"],
  };
  const resolvedQuery = Object.fromEntries(
    Object.entries({
      ...query,
      ...queryFromUrl,
      view: queryFromUrl.view ?? view,
    }).filter(([, value]) => value !== undefined),
  ) as Partial<ManagerReportQuery>;
  return useQuery({
    queryKey: [...armKeys.managerReport(view), resolvedQuery],
    queryFn: () => armApi.getManagerReport(resolvedQuery),
    staleTime: 30_000,
  });
}

function splitSearchValues(value: string | null): string[] {
  return value
    ? value.split(",").map((item) => item.trim()).filter(Boolean)
    : [];
}

function parseLimit(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function useApplicationUpdate<V>(fn: (vars: V) => Promise<Application>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    // Ключ по id из ответа: если панель успела переключиться на другую
    // заявку, ответ всё равно ляжет в кэш той, по которой был запрос.
    onSuccess: (app) => {
      qc.setQueryData(armKeys.application(app.id), app);
      void qc.invalidateQueries({ queryKey: armKeys.applications() });
      void qc.invalidateQueries({ queryKey: armKeys.autonomyPolicies() });
      void qc.invalidateQueries({ queryKey: armKeys.managerReports() });
    },
  });
}

export function useApplicationAction(id: string, employeeId: string) {
  return useApplicationUpdate((action: EmployeeAction) =>
    armApi.act(id, action, employeeId),
  );
}

export function useClientSimulation(id: string) {
  return useApplicationUpdate((response: ClientResponse) =>
    armApi.simulateClient(id, response),
  );
}

export function useResetDemo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => armApi.reset(),
    onSuccess: () => qc.invalidateQueries({ queryKey: armKeys.all }),
  });
}

/** Назначить ответственного сразу на несколько заявок из очереди. */
export function useAssignMany(employeeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, assigneeId }: { ids: string[]; assigneeId: string }) =>
      Promise.all(
        ids.map((id) =>
          armApi.act(id, { type: "assign", assigneeId }, employeeId),
        ),
      ),
    onSuccess: (apps) => {
      for (const app of apps) qc.setQueryData(armKeys.application(app.id), app);
    },
    // При частичной ошибке часть заявок уже назначена: список обновляем всегда.
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: armKeys.applications() });
      void qc.invalidateQueries({ queryKey: armKeys.managerReports() });
    },
  });
}
