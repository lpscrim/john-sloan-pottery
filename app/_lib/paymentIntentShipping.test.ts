import { describe, expect, it } from 'vitest';
import {
  calculateUpdatedPaymentIntentTotal,
  isUpdatablePaymentIntentStatus,
  isValidCountryCode,
  UPDATABLE_PAYMENT_INTENT_STATUSES,
} from './paymentIntentShipping';

describe('paymentIntentShipping', () => {
  it('accepts uppercase ISO country codes and rejects invalid values', () => {
    expect(isValidCountryCode('GB')).toBe(true);
    expect(isValidCountryCode('US')).toBe(true);
    expect(isValidCountryCode('gb')).toBe(false);
    expect(isValidCountryCode('GBR')).toBe(false);
    expect(isValidCountryCode('1B')).toBe(false);
  });

  it('allows shipping updates only for mutable payment intent statuses', () => {
    for (const status of UPDATABLE_PAYMENT_INTENT_STATUSES) {
      expect(isUpdatablePaymentIntentStatus(status)).toBe(true);
    }

    expect(isUpdatablePaymentIntentStatus('succeeded')).toBe(false);
    expect(isUpdatablePaymentIntentStatus('canceled')).toBe(false);
  });

  it('recalculates the total by replacing the previous shipping amount', () => {
    expect(calculateUpdatedPaymentIntentTotal(4500, 500, 1200)).toBe(5200);
    expect(calculateUpdatedPaymentIntentTotal(4500, 0, 800)).toBe(5300);
  });
});