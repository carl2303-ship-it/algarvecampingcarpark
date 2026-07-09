export const ADMIN_PAYMENT_METHODS = [
  { value: "cash", label: "Dinheiro" },
  { value: "transfer", label: "Transferência bancária" },
  { value: "mb", label: "Multibanco" },
  { value: "card", label: "Cartão" },
  { value: "stripe", label: "Stripe" },
  { value: "other", label: "Outro" },
] as const;

export type AdminPaymentMethod = (typeof ADMIN_PAYMENT_METHODS)[number]["value"];

export function paymentMethodLabel(value: string | null | undefined): string {
  return ADMIN_PAYMENT_METHODS.find((method) => method.value === value)?.label ?? "—";
}
