'use client';

import { useLiveSiteContent } from '@void/shared/content-store';
import { ButtonLink } from '@void/ui/components';
import { DiscordIcon } from '@void/ui/brand';

export function LiveDiscordButton() {
  const content = useLiveSiteContent();
  const url = content.discord?.url;

  if (url) {
    return (
      <ButtonLink href={url} external variant="secondary">
        <DiscordIcon width={18} height={18} /> Join our Discord
      </ButtonLink>
    );
  }

  return (
    <button disabled className="button button-secondary">
      <DiscordIcon width={18} height={18} /> Discord invite coming soon
    </button>
  );
}

