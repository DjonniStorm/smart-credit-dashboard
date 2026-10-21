"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { cabinetApi } from "@/shared/api/cabinet";

export const sessionKeys = {
  current: ["session", "current"] as const,
  accounts: ["session", "demo-accounts"] as const,
};

export function useSession() {
  return useQuery({
    queryKey: sessionKeys.current,
    queryFn: () => cabinetApi.currentAccount(),
    staleTime: Infinity,
  });
}

export function useDemoAccounts() {
  return useQuery({
    queryKey: sessionKeys.accounts,
    queryFn: () => cabinetApi.listDemoAccounts(),
  });
}

export function useSignIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (accountId: string) => cabinetApi.signIn(accountId),
    onSuccess: (account) => {
      queryClient.clear();
      queryClient.setQueryData(sessionKeys.current, account);
    },
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => cabinetApi.signOut(),
    onSuccess: () => {
      queryClient.clear();
      queryClient.setQueryData(sessionKeys.current, null);
    },
  });
}
