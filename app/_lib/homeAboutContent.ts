import { createServerSupabase } from './supabase';

export interface HomeAboutContent {
  text: string;
  images: string[];
}

export const HOME_ABOUT_DEFAULTS: HomeAboutContent = {
  text: 'John Sloan is a potter based on the Isle of Skye, Scotland. Working primarily with stoneware, he throws functional and sculptural pieces — mugs, bowls, vases, and more — each finished by hand in a range of distinctive glazes developed in his studio.',
  images: [], // TODO: Add default about section images (place in /public)
};

export async function getHomeAboutContent(): Promise<HomeAboutContent> {
  try {
    const supabase = createServerSupabase();
    const { data } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['home_about_text', 'home_about_images']);

    const map = new Map((data ?? []).map((r) => [r.key, r.value]));

    const text = map.get('home_about_text') ?? HOME_ABOUT_DEFAULTS.text;
    let images: string[] = HOME_ABOUT_DEFAULTS.images;
    if (map.has('home_about_images')) {
      try {
        images = JSON.parse(map.get('home_about_images')!);
      } catch {
        // fallback to defaults
      }
    }

    return { text, images };
  } catch {
    return HOME_ABOUT_DEFAULTS;
  }
}
