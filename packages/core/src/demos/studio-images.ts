import type { BusinessFacts } from '@wbm/templates';
import type { LlmImage } from '../providers/types';
import { optimizeImage } from '../render/images';

/** Only already authorized in-memory images. Never fetch model/user supplied URLs. */
export async function studioImages(photos: NonNullable<BusinessFacts['photos']>): Promise<LlmImage[]> {
  const images: LlmImage[] = [];
  for (const photo of photos.slice(0, 3)) {
    const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(photo.src);
    if (!photo.rightsConfirmed || !match || match[2]!.length > 12 * 1024 * 1024)
      throw new Error('Gestaltungs-Bildslot nicht als berechtigtes eingebettetes Bild verfügbar.');
    const data = await optimizeImage(Buffer.from(match[2]!, 'base64'), match[1]!, {
      maxWidth: 640,
      format: 'jpeg',
      quality: 0.75,
    });
    images.push({ mediaType: 'image/jpeg', data: data.toString('base64') });
  }
  return images;
}
