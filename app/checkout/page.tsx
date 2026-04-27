import CheckoutClient from './CheckoutClient';
import { getShippingRegion, ALLOWED_COUNTRIES } from '@/app/_lib/shippingSettings';

export default async function CheckoutPage() {
  const region = await getShippingRegion();
  return <CheckoutClient allowedCountries={ALLOWED_COUNTRIES[region]} />;
}
