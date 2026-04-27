import { getCategoriesVisible, getShippingRates, getShippingRegion } from '@/app/_lib/shippingSettings';
import { ShippingForm } from './ShippingForm';
import { ShippingRegionToggle } from './ShippingRegionToggle';
import { CategoriesToggle } from './CategoriesToggle';

export default async function SettingsPage() {
  const [rates, shippingRegion, categoriesVisible] = await Promise.all([
    getShippingRates(),
    getShippingRegion(),
    getCategoriesVisible(),
  ]);

  return (
    <div className="bg-background text-foreground px-6 pt-32 pb-16">
      <div className="max-w-xl mx-auto space-y-12">
        <div className="space-y-4">
          <div>
            <h1 className="text-3xl tracking-tight mb-16">SETTINGS</h1>
            <h2 className="text-xl tracking-tight">SHIPPING RATES</h2>
            <p className="text-base text-muted-foreground mt-1">
              If the basket contains only prints, the print rate applies. If any original artwork or painting is added, the artwork rate is used instead.
            </p>
          </div>
          <ShippingForm rates={rates} />
        </div>

        <div className="space-y-4 border-t border-muted pt-10">
          <div>
            <h2 className="text-xl tracking-tight">SHIPPING REGION</h2>
            <p className="text-base text-muted-foreground mt-1">
              Controls which countries customers can ship to at checkout.
            </p>
          </div>
          <ShippingRegionToggle current={shippingRegion} />
        </div>

        <div className="space-y-4 border-t border-muted pt-10">
          <div>
            <h2 className="text-xl tracking-tight">CATEGORY FILTERS</h2>
            <p className="text-base text-muted-foreground mt-1">
              Show or hide category filter buttons on the Work gallery.
            </p>
          </div>
          <CategoriesToggle current={categoriesVisible} />
        </div>
      </div>
    </div>
  );
}
