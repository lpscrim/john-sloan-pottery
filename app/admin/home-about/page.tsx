import { getHomeAboutContent } from '@/app/_lib/homeAboutContent';
import HomeAboutClient from './HomeAboutClient';

export default async function HomeAboutPage() {
  const content = await getHomeAboutContent();

  return (
    <div className="bg-background text-foreground px-6 pt-32 pb-16">
      <div className="max-w-2xl mx-auto space-y-10">
        <h1 className="text-3xl tracking-tight">HOME ABOUT SECTION</h1>
        <p className="text-base text-muted-foreground -mt-4">
          Edit the intro text and images shown in the About section on the{' '}
          <a href="/#about" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
            home page
          </a>
          .
        </p>
        <HomeAboutClient initial={content} />
      </div>
    </div>
  );
}
