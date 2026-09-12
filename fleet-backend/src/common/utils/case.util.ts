function snakeToCamel(key: string): string {
  return key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") return false;
  if (Array.isArray(value) || value instanceof Date) return false;
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(value)) return false;
  if (value instanceof Uint8Array) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

export function keysToCamel<T = unknown>(value: unknown): T {
  if (value === null || value === undefined) return value as T;
  if (Array.isArray(value)) return value.map((v) => keysToCamel(v)) as T;
  if (value instanceof Date) return value as T;
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(value)) return value as T;
  if (value instanceof Uint8Array) return value as T;
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [snakeToCamel(k), keysToCamel(v)]),
    ) as T;
  }
  // Leave class instances (e.g. StreamableFile) untouched
  return value as T;
}
