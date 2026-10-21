"use client";

import type { ArmApi } from "../types";
import {
  type MockRecord,
  applyAction,
  applyClientResponse,
  tick,
} from "./flow";
import { createSeed, employees, products } from "./seed";

// Состояние живёт в браузере: переживает перезагрузку, сбрасывается кнопкой в шапке.
const STORAGE_KEY = "arm-mock-v1";
const LATENCY_MS = 250;

let records: MockRecord[] | null = null;

function load(): MockRecord[] {
  if (records) return records;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) records = JSON.parse(saved) as MockRecord[];
  } catch {
    records = null;
  }
  records ??= createSeed(Date.now());
  save();
  return records;
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Хранилище недоступно (приватный режим): демо работает до перезагрузки.
  }
}

/** Продвинуть автоматику до текущего момента. */
function advance(): MockRecord[] {
  const all = load();
  const now = Date.now();
  if (all.map((r) => tick(r, now, products)).some(Boolean)) save();
  return all;
}

const wait = () => new Promise((r) => setTimeout(r, LATENCY_MS));
const copy = <T>(v: T): T => structuredClone(v);

function find(id: string): MockRecord {
  const rec = advance().find((r) => r.app.id === id);
  if (!rec) throw new Error(`Заявка ${id} не найдена`);
  return rec;
}

export const mockArmApi: ArmApi = {
  async listApplications() {
    await wait();
    return copy(advance().map((r) => r.app));
  },
  async getApplication(id) {
    await wait();
    return copy(find(id).app);
  },
  async act(id, action, employeeId) {
    await wait();
    const rec = find(id);
    const employee = employees.find((e) => e.id === employeeId);
    if (!employee) throw new Error("Сессия сотрудника не найдена");
    applyAction(rec, action, employee, employees, products, Date.now());
    save();
    return copy(rec.app);
  },
  async simulateClient(id, response) {
    await wait();
    const rec = find(id);
    applyClientResponse(rec, response, Date.now());
    save();
    return copy(rec.app);
  },
  async listProducts() {
    await wait();
    return copy(products);
  },
  async listEmployees() {
    await wait();
    return copy(employees);
  },
  async reset() {
    records = createSeed(Date.now());
    save();
  },
};
