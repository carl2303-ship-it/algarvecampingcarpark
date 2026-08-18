/** PostgREST / Postgres errors for a missing table or column. */
export function isMissingRelationError(error: unknown): boolean {
  const message = errorMessage(error);
  const code = errorCode(error);
  return (
    code === "PGRST205" ||
    code === "42P01" ||
    /could not find the table/i.test(message) ||
    /schema cache/i.test(message) ||
    /relation .+ does not exist/i.test(message)
  );
}

export function isMissingColumnError(error: unknown): boolean {
  const message = errorMessage(error);
  const code = errorCode(error);
  return (
    code === "PGRST204" ||
    code === "42703" ||
    /could not find the .+ column/i.test(message) ||
    /column .+ does not exist/i.test(message)
  );
}

function errorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message ?? "");
  }
  return "";
}

function errorCode(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    return String((error as { code?: unknown }).code ?? "");
  }
  return "";
}
