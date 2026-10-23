type QueryKeyNode = Record<string, unknown> & { baseUrl?: string };

export function withStableQueryKey<
  T extends { queryKey: readonly [QueryKeyNode] },
>(options: T): T {
  const [params] = options.queryKey;
  const rest = { ...params };
  delete rest.baseUrl;
  return {
    ...options,
    queryKey: [rest] as unknown as T["queryKey"],
  };
}
