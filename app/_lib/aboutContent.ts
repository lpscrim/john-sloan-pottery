import { createServerSupabase } from './supabase';

export interface AboutContent {
  statement: string;
  bio: string;
  portrait_url: string;
  gallery_images: string[];
  secondary_image_url: string;
  secondary_text: string;
}

const defaults: AboutContent = {
  statement: '',
  bio: '',
  portrait_url: '',
  gallery_images: [],
  secondary_image_url: '',
  secondary_text: '',
};

export async function getAboutContent(): Promise<AboutContent> {
  try {
    const supabase = createServerSupabase();
    const { data } = await supabase
      .from('about_content')
      .select('statement, bio, portrait_url, gallery_images')
      .eq('id', 1)
      .single();

    if (!data) return defaults;

    // Fetch secondary fields separately — gracefully handles the case where
    // these columns have not yet been added to the Supabase table.
    // TODO: Add `secondary_image_url` (text) and `secondary_text` (text) columns
    //       to the `about_content` table in Supabase.
    let secondary_image_url = '';
    let secondary_text = '';
    try {
      const { data: sec } = await supabase
        .from('about_content')
        .select('secondary_image_url, secondary_text')
        .eq('id', 1)
        .single();
      secondary_image_url = (sec?.secondary_image_url as string) ?? '';
      secondary_text = (sec?.secondary_text as string) ?? '';
    } catch { /* columns may not exist yet */ }

    return {
      statement: data.statement ?? '',
      bio: data.bio ?? '',
      portrait_url: data.portrait_url ?? '',
      gallery_images: (data.gallery_images as string[]) ?? [],
      secondary_image_url,
      secondary_text,
    };
  } catch {
    return defaults;
  }
}
