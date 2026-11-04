import { MessageCircle, Radio, Shapes } from 'lucide-react';
import { DiscordIcon } from '@void/ui/brand';
export function CommunityOrbit() {
  return <div className="community-orbit" data-community-orbit aria-hidden="true"><DiscordIcon/><span className="orbit-label"><Radio/>Announcements</span><span className="orbit-label"><MessageCircle/>Conversations</span><span className="orbit-label"><Shapes/>Shared ideas</span></div>;
}
