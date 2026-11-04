'use client';

import { useLiveSiteContent } from '@void/shared/content-store';
import { Gallery } from '@void/ui/interactive';

export function LiveSneakPeeksGallery() {
  const content = useLiveSiteContent();
  const items = content.sneakPeeks || [];

  return <Gallery items={items} />;
}

