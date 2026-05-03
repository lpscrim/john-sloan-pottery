import { getGlazes, getMugShapes, getMugSizes, getMugExampleUrls } from '@/app/_lib/customMug';
import CustomMugConfigurator from './CustomMugConfigurator';

export const metadata = {
  title: 'Build Your Mug | John Sloan Pottery',
  description: 'Choose your glazes and shape. Each mug is thrown and fired by hand to order.',
};

export default async function CustomMugPage() {
  const [glazes, shapes, sizes, examples] = await Promise.all([
    getGlazes(),
    getMugShapes(),
    getMugSizes(),
    getMugExampleUrls(),
  ]);

  return (
    <main className="min-h-screen px-6 py-24 xl:py-32">
      <div className="max-w-7xl mx-auto">
        <div className="mb-16">
          <h1 className="text-3xl md:text-5xl tracking-tight">Build Your Mug</h1>
          <p className="mt-4 text-muted-foreground text-lg max-w-xl">
            Choose your glazes and shape. Each piece is thrown and fired by hand to order.
          </p>
        </div>
        <CustomMugConfigurator
          glazes={glazes}
          shapes={shapes}
          sizes={sizes}
          examples={examples}
        />
      </div>
    </main>
  );
}
