import heroSanctuary from '../../assets/images/storefront_hero_sanctuary_1794917473310.jpg';
import wellnessSuite from '../../assets/images/service_wellness_suite_1794917473266.jpg';
import remedialTherapy from '../../assets/images/service_remedial_therapy_1794917473583.jpg';
import physioStudio from '../../assets/images/service_physiotherapy_studio_1794917474759.jpg';
import dermatologyCare from '../../assets/images/service_dermatology_care_1794917474855.jpg';

export const STOREFRONT_HERO_IMAGE = heroSanctuary;

const SERVICE_SLUG_IMAGES: Record<string, string> = {
  'executive-wellness': wellnessSuite,
  'deep-tissue-therapy': remedialTherapy,
  'physiotherapy-review': physioStudio,
  'laser-dermatology': dermatologyCare,
};

const FALLBACK_GALLERY = [
  wellnessSuite,
  remedialTherapy,
  physioStudio,
  dermatologyCare,
];

export function resolveServiceImage(
  imageUrl: string | null | undefined,
  slug: string,
  index: number
): string {
  if (imageUrl && imageUrl.trim().length > 0) {
    return imageUrl;
  }
  return SERVICE_SLUG_IMAGES[slug] ?? FALLBACK_GALLERY[index % FALLBACK_GALLERY.length]!;
}
