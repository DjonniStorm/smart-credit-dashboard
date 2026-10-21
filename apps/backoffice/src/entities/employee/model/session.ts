"use client";

import { useSyncExternalStore } from "react";

// Демо-вход: в браузере хранится только id выбранной учётки. Пароля нет,
// настоящая авторизация сотрудника будет через api.
const KEY = "arm-session";
const listeners = new Set<() => void>();

function read(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

/** id сотрудника, null без входа, undefined пока не прочитали хранилище. */
export function useSessionEmployeeId(): string | null | undefined {
  return useSyncExternalStore(subscribe, read, () => undefined);
}

export function signIn(employeeId: string) {
  try {
    localStorage.setItem(KEY, employeeId);
  } finally {
    listeners.forEach((l) => l());
  }
}

export function signOut() {
  try {
    localStorage.removeItem(KEY);
  } finally {
    listeners.forEach((l) => l());
  }
}
