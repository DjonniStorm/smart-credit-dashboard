"use client";

import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { type ApplicationDraft, loadDraft } from "./draft";

const Selection = createContext<{
  selected: string | null;
  select: (id: string | null) => void;
  draft: ApplicationDraft | null;
}>({ selected: null, select: () => {}, draft: null });

/** Ключ учётки у провайдера исключает перенос выбранной заявки между компаниями. */
export function FinancingSelection({
  accountId,
  children,
}: {
  accountId?: string;
  children: ReactNode;
}) {
  const [selected, select] = useState<string | null>(null);
  const [draft, setDraft] = useState<ApplicationDraft | null>(null);
  useEffect(() => {
    function refresh() {
      const stored = loadDraft();
      setDraft(stored?.accountId === accountId ? stored : null);
    }
    // localStorage доступен только после гидрации.
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("kk-draft-changed", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", refresh);
      window.removeEventListener("kk-draft-changed", refresh);
    };
  }, [accountId]);
  return <Selection value={{ selected, select, draft }}>{children}</Selection>;
}

export const useFinancingSelection = () => {
  return useContext(Selection);
};
