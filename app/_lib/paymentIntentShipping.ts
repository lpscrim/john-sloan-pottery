export const UPDATABLE_PAYMENT_INTENT_STATUSES = [
  'requires_payment_method',
  'requires_confirmation',
  'requires_action',
] as const;

export function isValidCountryCode(country: string): boolean {
  return /^[A-Z]{2}$/.test(country);
}

export function isUpdatablePaymentIntentStatus(status: string): boolean {
  return UPDATABLE_PAYMENT_INTENT_STATUSES.includes(
    status as (typeof UPDATABLE_PAYMENT_INTENT_STATUSES)[number]
  );
}

export function calculateUpdatedPaymentIntentTotal(
  amount: number,
  previousShippingAmount: number,
  nextShippingAmount: number,
): number {
  const subtotal = amount - previousShippingAmount;
  return subtotal + nextShippingAmount;
}