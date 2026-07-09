import { adminT } from "@/lib/admin-i18n";

export const ADMIN_PAYMENT_METHODS = [
  { value: "cash", label: adminT.paymentMethods.cash },
  { value: "transfer", label: adminT.paymentMethods.bank_transfer },
  { value: "mb", label: adminT.paymentMethods.multibanco },
  { value: "card", label: adminT.paymentMethods.card },
  { value: "stripe", label: adminT.paymentMethods.stripe },
  { value: "other", label: adminT.paymentMethods.other },
] as const;

export type AdminPaymentMethod = (typeof ADMIN_PAYMENT_METHODS)[number]["value"];

export function paymentMethodLabel(value: string | null | undefined): string {
  return ADMIN_PAYMENT_METHODS.find((method) => method.value === value)?.label ?? "—";
}
