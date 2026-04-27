import { createServerSupabase } from './supabase';

export interface Exhibition {
  year: string;
  title: string;
  location: string;
  type: 'solo' | 'group';
}

export interface EducationItem {
  year: string;
  qualification: string;
  institution: string;
}

export interface Award {
  year: string;
  title: string;
}

export interface PressItem {
  year: string;
  title: string;
  publication: string;
  url?: string;
}

export interface AboutContent {
  statement: string;
  bio: string;
  portrait_url: string;
  exhibitions: Exhibition[];
  education: EducationItem[];
  awards: Award[];
  press: PressItem[];
  gallery_images: string[];
}

const defaults: AboutContent = {
  statement: '',
  bio: '',
  portrait_url: '',
  exhibitions: [],
  education: [],
  awards: [],
  press: [],
  gallery_images: [],
};

export async function getAboutContent(): Promise<AboutContent> {
  try {
    const supabase = createServerSupabase();
    const { data } = await supabase
      .from('about_content')
      .select('statement, bio, portrait_url, exhibitions, education, awards, press, gallery_images')
      .eq('id', 1)
      .single();

    if (!data) return defaults;
    return {
      statement: data.statement ?? '',
      bio: data.bio ?? '',
      portrait_url: data.portrait_url ?? '',
      exhibitions: (data.exhibitions as Exhibition[]) ?? [],
      education: (data.education as EducationItem[]) ?? [],
      awards: (data.awards as Award[]) ?? [],
      press: (data.press as PressItem[]) ?? [],
      gallery_images: (data.gallery_images as string[]) ?? [],
    };
  } catch {
    return defaults;
  }
}
