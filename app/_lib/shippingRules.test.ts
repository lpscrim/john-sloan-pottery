import { describe, expect, it } from 'vitest';
import { ALLOWED_COUNTRIES, resolveRateForCountry, resolveShippingRate, type ShippingRates } from './shippingRules';

const rates: ShippingRates = {
  gbRate: 500,
  euRate: 1200,
  intRate: 2200,
};

describe('shippingRules', () => {
  it('uses the GB rate as the default checkout shipping rate', () => {
    expect(resolveShippingRate(rates)).toBe(500);
  });

  it('returns the GB rate for Great Britain', () => {
    expect(resolveRateForCountry(rates, 'GB')).toBe(500);
  });

  it('returns the EU rate for supported EU-region destinations', () => {
    expect(resolveRateForCountry(rates, 'FR')).toBe(1200);
    expect(resolveRateForCountry(rates, 'CH')).toBe(1200);
  });

  it('returns the international rate for non-EU destinations', () => {
    expect(resolveRateForCountry(rates, 'US')).toBe(2200);
  });

  it('exposes country allowlists for each configured shipping region', () => {
    expect(ALLOWED_COUNTRIES.gb).toEqual(['GB']);
    expect(ALLOWED_COUNTRIES.eu).toContain('FR');
    expect(ALLOWED_COUNTRIES.international).toContain('US');
  });
});