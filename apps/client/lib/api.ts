// Вызовы api выполняются на сервере Next.js (server components),
// поэтому адрес внутренний: localhost в dev, имя сервиса в docker compose.
const API_URL = process.env.API_URL ?? "http://localhost:4000";

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`api ${path} -> ${res.status}`);
  }
  return (await res.json()) as T;
}
