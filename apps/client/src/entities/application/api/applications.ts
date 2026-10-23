"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  Application,
  ApplicationInput,
  ClientAnswer,
} from "@repo/contracts/cabinet";

import { cabinetApi } from "@/shared/api/cabinet";

export const applicationKeys = {
  all: ["applications"] as const,
  one: (id: string) => ["applications", id] as const,
};

/** Пока банк работает с заявкой, опрашиваем её: статус меняется сам. */
function isMoving(app: Application | undefined) {
  return app?.status === "in_review" || app?.deal?.stage === "disbursing";
}

export function useApplications() {
  return useQuery({
    queryKey: applicationKeys.all,
    queryFn: () => cabinetApi.listApplications(),
    staleTime: 0,
    refetchInterval: (q) =>
      q.state.data?.some((a) => isMoving(a)) ? 2_000 : false,
  });
}

export function useApplication(id: string) {
  return useQuery({
    queryKey: applicationKeys.one(id),
    queryFn: () => cabinetApi.getApplication(id),
    staleTime: 0,
    retry: (count, error) =>
      !("status" in error && error.status === 404) && count < 2,
    refetchInterval: (q) => (isMoving(q.state.data) ? 1_000 : false),
  });
}

function useUpdate() {
  const queryClient = useQueryClient();
  return (app: Application) => {
    queryClient.setQueryData(applicationKeys.one(app.id), app);
    void queryClient.invalidateQueries({
      queryKey: applicationKeys.all,
      exact: true,
    });
  };
}

export function useCreateApplication() {
  const update = useUpdate();
  return useMutation({
    mutationFn: (input: ApplicationInput) =>
      cabinetApi.createApplication(input),
    onSuccess: update,
  });
}

export function useAnswerRequest(id: string) {
  const update = useUpdate();
  return useMutation({
    mutationFn: (v: { requestId: string; answer: ClientAnswer }) =>
      cabinetApi.answerRequest(id, v.requestId, v.answer),
    onSuccess: update,
  });
}

export function useAcceptOffer(id: string) {
  const update = useUpdate();
  return useMutation({
    mutationFn: () => cabinetApi.acceptOffer(id),
    onSuccess: update,
  });
}

export function useDeclineOffer(id: string) {
  const update = useUpdate();
  return useMutation({
    mutationFn: () => cabinetApi.declineOffer(id),
    onSuccess: update,
  });
}

export function useRequestSignCode(id: string) {
  return useMutation({ mutationFn: () => cabinetApi.requestSignCode(id) });
}

export function useSign(id: string) {
  const update = useUpdate();
  return useMutation({
    mutationFn: (code: string) => cabinetApi.sign(id, code),
    onSuccess: update,
  });
}
