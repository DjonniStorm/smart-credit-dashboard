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
  return (
    app?.status === "in_review" ||
    app?.deal?.stage === "offer" ||
    app?.deal?.stage === "disbursing"
  );
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

type ActionTarget = Pick<Application, "id" | "updatedAt">;

/**
 * Ключ идемпотентности привязан к версии заявки: повторное нажатие по той же версии
 * сервер узнаёт и не выполняет второй раз, а после изменения заявки ключ новый.
 */
function actionKey(app: ActionTarget, action: string) {
  return `${app.id}:${action}:${app.updatedAt}`;
}

export function useAnswerRequest(app: ActionTarget) {
  const update = useUpdate();
  return useMutation({
    mutationFn: (v: { requestId: string; answer: ClientAnswer }) =>
      cabinetApi.answerRequest(
        app.id,
        v.requestId,
        v.answer,
        actionKey(app, "answer_request"),
      ),
    onSuccess: update,
  });
}

export function useAcceptOffer(app: ActionTarget) {
  const update = useUpdate();
  return useMutation({
    mutationFn: () =>
      cabinetApi.acceptOffer(app.id, actionKey(app, "accept_offer")),
    onSuccess: update,
  });
}

export function useDeclineOffer(app: ActionTarget) {
  const update = useUpdate();
  return useMutation({
    mutationFn: () =>
      cabinetApi.declineOffer(app.id, actionKey(app, "decline_offer")),
    onSuccess: update,
  });
}

export function useRequestSignCode(app: ActionTarget) {
  return useMutation({
    mutationFn: () =>
      cabinetApi.requestSignCode(app.id, actionKey(app, "request_sign_code")),
  });
}

export function useSetUrgent(app: ActionTarget) {
  const update = useUpdate();
  return useMutation({
    mutationFn: (v: { enabled: boolean; reason: string }) =>
      cabinetApi.setUrgent(
        app.id,
        v.enabled,
        v.reason,
        actionKey(app, "set_urgent"),
      ),
    onSuccess: update,
  });
}

export function useSign(app: ActionTarget) {
  const update = useUpdate();
  return useMutation({
    mutationFn: (code: string) =>
      cabinetApi.sign(app.id, code, actionKey(app, "sign")),
    onSuccess: update,
  });
}
