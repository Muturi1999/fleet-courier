function snakeToCamel(key: string): string {
  return key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

export function keysToCamel<T = unknown>(value: unknown): T {
  if (value === null || value === undefined) return value as T;
  if (Array.isArray(value)) return value.map((v) => keysToCamel(v)) as T;
  if (value instanceof Date) return value as T;
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [snakeToCamel(k), keysToCamel(v)]),
    ) as T;
  }
  return value as T;
}
