export type Row = Record<string, unknown>;

export function rowsOf(result: unknown): Row[] {
  if (Array.isArray(result) && Array.isArray(result[0])) {
    return result[0] as Row[];
  }
  return result as Row[];
}

export function number(value: unknown): number {
  return Number(value ?? 0);
}

function label(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function metricLine(
  name: string,
  value: number | string,
  labels?: Record<string, string>,
): string {
  const labelPart =
    labels && Object.keys(labels).length > 0
      ? `{${Object.entries(labels)
          .map(([key, item]) => {
            return `${key}="${label(item)}"`;
          })
          .join(",")}}`
      : "";
  return `${name}${labelPart} ${value}`;
}
