"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  Application,
  ClientResponse,
  EmployeeAction,
} from "@repo/contracts/application";

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

function useApplicationUpdate<V>(
  id: string,
  fn: (vars: V) => Promise<Application>,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (app) => {
      qc.setQueryData(armKeys.application(id), app);
      void qc.invalidateQueries({ queryKey: armKeys.applications() });
    },
  });
}

export function useApplicationAction(id: string, employeeId: string) {
  return useApplicationUpdate(id, (action: EmployeeAction) =>
    armApi.act(id, action, employeeId),
  );
}

export function useClientSimulation(id: string) {
  return useApplicationUpdate(id, (response: ClientResponse) =>
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
