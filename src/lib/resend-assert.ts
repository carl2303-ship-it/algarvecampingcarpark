import type { CreateEmailResponseSuccess, ErrorResponse } from "resend";

type ResendSendResult = {
  data: CreateEmailResponseSuccess | null;
  error: ErrorResponse | null;
};

/** Resend returns { data, error } without throwing — treat error as failure. */
export function assertResendSent(
  result: ResendSendResult,
  context: string
): asserts result is ResendSendResult & { data: CreateEmailResponseSuccess } {
  if (result.error) {
    const message = result.error.message || JSON.stringify(result.error);
    throw new Error(`${context}: ${message}`);
  }
  if (!result.data?.id) {
    throw new Error(`${context}: réponse Resend sans id`);
  }
}
