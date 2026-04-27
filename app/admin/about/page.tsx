import { getAboutContent } from '@/app/_lib/aboutContent';
import AboutClient from './AboutClient';

export default async function AdminAboutPage() {
  const about = await getAboutContent();

  return (
    <div className="bg-background text-foreground px-6 pt-32 pb-16">
      <div className="max-w-4xl mx-auto space-y-10">
        <h1 className="text-3xl tracking-tight">ABOUT PAGE</h1>
        <p className="text-base text-muted-foreground -mt-4">
          Edit the content shown on the public{' '}
          <a href="/about" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
            /about
          </a>{' '}
          page.
        </p>
        <AboutClient initial={about} />
      </div>
    </div>
  );
}
