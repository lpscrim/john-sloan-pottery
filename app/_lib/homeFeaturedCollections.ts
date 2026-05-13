import { createServerSupabase } from './supabase';

export interface HomeFeaturedCollectionSlide {
  title: string;
  text: string;
  category: string;
  buttonLabel: string;
  imageUrl: string;
}

export interface HomeFeaturedCollectionsContent {
  slides: HomeFeaturedCollectionSlide[];
}

export const HOME_FEATURED_COLLECTIONS_DEFAULTS: HomeFeaturedCollectionsContent = {
  slides: [
    {
      title: 'Summer Collection',
      text: 'Bright, lively pieces for the longer days.',
      category: 'SUMMER COLLECTION',
      buttonLabel: 'View collection',
      imageUrl: '',
    },
    {
      title: 'Tall Mugs',
      text: 'Thrown for generous pours and slower mornings.',
      category: 'TALL MUGS',
      buttonLabel: 'Shop tall mugs',
      imageUrl: '',
    },
    {
      title: 'Whisky Jars',
      text: 'Stoneware vessels made for the shelf and the table.',
      category: 'WHISKY JARS',
      buttonLabel: 'Explore jars',
      imageUrl: '',
    },
  ],
};

function normalizeSlides(value: unknown): HomeFeaturedCollectionSlide[] {
  const fallback = HOME_FEATURED_COLLECTIONS_DEFAULTS.slides;
  if (!Array.isArray(value)) return fallback;

  const normalized = value.slice(0, 3).map((slide, index) => {
    const safe = typeof slide === 'object' && slide !== null ? slide as Record<string, unknown> : {};
    const defaultSlide = fallback[index] ?? fallback[0];
    return {
      title: typeof safe.title === 'string' ? safe.title : defaultSlide.title,
      text: typeof safe.text === 'string' ? safe.text : defaultSlide.text,
      category: typeof safe.category === 'string' ? safe.category : defaultSlide.category,
      buttonLabel: typeof safe.buttonLabel === 'string' ? safe.buttonLabel : defaultSlide.buttonLabel,
      imageUrl: typeof safe.imageUrl === 'string' ? safe.imageUrl : defaultSlide.imageUrl,
    };
  });

  while (normalized.length < 3) {
    normalized.push(fallback[normalized.length]);
  }

  return normalized;
}

export async function getHomeFeaturedCollectionsContent(): Promise<HomeFeaturedCollectionsContent> {
  try {
    const supabase = createServerSupabase();
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'home_featured_collections')
      .single();

    if (!data?.value) return HOME_FEATURED_COLLECTIONS_DEFAULTS;

    try {
      return { slides: normalizeSlides(JSON.parse(data.value)) };
    } catch {
      return HOME_FEATURED_COLLECTIONS_DEFAULTS;
    }
  } catch {
    return HOME_FEATURED_COLLECTIONS_DEFAULTS;
  }
}