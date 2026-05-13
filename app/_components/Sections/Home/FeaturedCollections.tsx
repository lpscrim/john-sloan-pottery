import { getHomeFeaturedCollectionsContent } from '@/app/_lib/homeFeaturedCollections';
import FeaturedCollectionsClient from './FeaturedCollectionsClient';

export async function FeaturedCollections() {
  const content = await getHomeFeaturedCollectionsContent();
  return <FeaturedCollectionsClient slides={content.slides} />;
}