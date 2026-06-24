/** Parse NestJS / API proxy error bodies into a user-visible message. */
export function parseApiErrorBody(body: unknown, fallback = "Request failed"): string {
  if (!body || typeof body !== "object") return fallback;
  const record = body as { message?: string | string[]; error?: string };
  if (Array.isArray(record.message)) return record.message.join(", ");
  if (typeof record.message === "string" && record.message.trim()) return record.message;
  if (typeof record.error === "string" && record.error.trim()) return record.error;
  return fallback;
}

export async function parseApiErrorResponse(res: Response, fallback = "Request failed"): Promise<string> {
  try {
    return parseApiErrorBody(await res.json(), fallback);
  } catch {
    return fallback;
  }
}

export function saveErrorMessage(error: unknown, fallback = "Save failed"): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}
