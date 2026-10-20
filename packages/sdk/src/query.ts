type QueryKeyNode = Record<string, unknown> & { baseUrl?: string };

export function withStableQueryKey<
  T extends { queryKey: readonly [QueryKeyNode] },
>(options: T): T {
  const [params] = options.queryKey;
  const { baseUrl: _baseUrl, ...rest } = params;
  return {
    ...options,
    queryKey: [rest] as unknown as T["queryKey"],
  };
}
