export type ModuleCategory = 'Combat' | 'Movement' | 'Visuals' | 'Utility' | 'Miscellaneous';
export type ClientModule = { id: string; name: string; description: string; category: ModuleCategory; availability: 'available' | 'upcoming'; icon: 'crosshair' | 'eye' | 'settings' | 'layers' | 'move' };
export type ReleaseEntry = { id: string; version: string; date: string; title: string; kind: 'major' | 'minor' | 'fix'; features: string[]; improvements: string[]; fixes: string[]; notices: string[] };
export type PartnerEntry = { id: string; name: string; description: string | null; logo: string | null; website: string | null; discord: string | null; serverAddress: string | null; status: 'published' | 'pending' };
export type FAQEntry = { id: string; category: 'General' | 'Installation' | 'Compatibility' | 'Downloads' | 'Support'; question: string; answer: string };

// Verified client modules published for the preview library inspired by official ClickGUI specifications.
export const modules: ClientModule[] = [
  { id: 'kill-aura', name: 'Kill Aura', description: 'Automatically attack nearby hostile targets and players with precision reach.', category: 'Combat', availability: 'available', icon: 'crosshair' },
  { id: 'auto-sprint', name: 'Auto Sprint', description: 'Sprint automatically when moving forward without double-tapping keys.', category: 'Movement', availability: 'available', icon: 'move' },
  { id: 'fly', name: 'Fly', description: 'Allows smooth directional flight and hover mode in Bedrock worlds.', category: 'Movement', availability: 'available', icon: 'move' },
  { id: 'speed', name: 'Speed', description: 'Increases ground movement and strafing velocity seamlessly.', category: 'Movement', availability: 'available', icon: 'move' },
  { id: 'no-fall', name: 'No Fall', description: 'Calculates descent packets to prevent critical fall damage.', category: 'Movement', availability: 'available', icon: 'move' },
  { id: 'scaffold', name: 'Scaffold', description: 'Automatically places blocks beneath your feet as you navigate across gaps.', category: 'Utility', availability: 'available', icon: 'layers' },
  { id: 'chest-stealer', name: 'Chest Stealer', description: 'Instantly extracts and organizes prioritized loot from opened containers.', category: 'Utility', availability: 'available', icon: 'settings' },
  { id: 'x-ray', name: 'X-Ray', description: 'Filters opaque blocks to reveal valuable ores and underground structures.', category: 'Visuals', availability: 'available', icon: 'eye' },
  { id: 'fullbright', name: 'Fullbright', description: 'Brightens dark caves, underwater terrain, and night environments.', category: 'Visuals', availability: 'available', icon: 'eye' },
  { id: 'nuker', name: 'Nuker', description: 'Mines and breaks designated block clusters in a configurable radius.', category: 'Utility', availability: 'upcoming', icon: 'layers' },
];
export const changelog: ReleaseEntry[] = [];
export const partners: PartnerEntry[] = [{
  id: 'zerix-network', name: 'Zerix Network', description: null,
  logo: '/media/partners/zerix.webp', website: null, discord: null, serverAddress: null, status: 'pending',
}];
export const faqs: FAQEntry[] = [
  { id: 'what-is-void', category: 'General', question: 'What is Void Client?', answer: 'Void Client is a Minecraft Bedrock client. This is its official website for release information, verified modules, community links, and account access.' },
  { id: 'release', category: 'General', question: 'Where can I follow development?', answer: 'Visit Changelog for published release notes and Sneak peeks for previews. The Discord page will link to the official community when its invite is available.' },
  { id: 'install', category: 'Installation', question: 'How do I install Void Client?', answer: 'Installation instructions will be published alongside a verified release on the Download page. Wait for those instructions before installing files from an unofficial source.' },
  { id: 'requirements', category: 'Installation', question: 'What are the system requirements?', answer: 'System requirements have not been published yet. The Download page will list confirmed operating systems, hardware requirements, and installation steps when available.' },
  { id: 'bedrock', category: 'Compatibility', question: 'Is Void for Bedrock or Java Edition?', answer: 'Void Client is for Minecraft Bedrock Edition. Compatibility with specific Bedrock versions will be listed with each release.' },
  { id: 'platforms', category: 'Compatibility', question: 'Which platforms are supported?', answer: 'Platform availability is shown on the Download page. A Coming soon label means there is no verified download available; it is not a confirmation of platform support.' },
  { id: 'download', category: 'Downloads', question: 'Where is the official download?', answer: 'The Download page is the source for verified client downloads. If a download is marked Coming soon, an official file has not been published here yet.' },
  { id: 'cost', category: 'Downloads', question: 'Is there a price for Void Client?', answer: 'Pricing has not been announced. No payment is requested for an unpublished release, and the store only enables checkout for real, available products.' },
  { id: 'help', category: 'Support', question: 'How can I get help?', answer: 'Start with the installation and compatibility answers here. The Discord page will provide the official community invitation when it is available.' },
  { id: 'account', category: 'Support', question: 'How do I recover my account?', answer: 'Open the Account portal and choose Forgot password. When account services are available, a recovery link can be sent to your registered email address.' },
];

export const showcase = [
  { id: 'clickgui', name: 'ClickGUI', title: 'Everything in its place.', description: 'An interface direction built around clarity. Official client screenshots will replace this concept.', image: '/media/interface-concept.svg', alt: 'Original black-and-gold interface concept, not a screenshot of the released client', status: 'Design concept' },
  { id: 'hud', name: 'HUD', title: 'A clearer point of view.', description: 'A visual study of an uncluttered heads-up display. Client behavior and available controls are not confirmed.', image: '/media/hud-concept.svg', alt: 'Conceptual heads-up display over original monochrome voxel artwork', status: 'Design concept' },
  { id: 'gameplay', name: 'Gameplay', title: 'Room to explore.', description: 'Original voxel artwork sets the mood. Verified gameplay captures are still to come.', image: '/media/landscape.svg', alt: 'Original obsidian voxel landscape with warm gold lighting, not Minecraft gameplay', status: 'Artwork preview' },
  { id: 'visuals', name: 'Visual interfaces', title: 'Details with purpose.', description: 'A study of the Void visual language. This preview is not a promise of client features.', image: '/media/visual-concept.svg', alt: 'Gold geometric V sculpture in a dark architectural scene', status: 'Design concept' },
  { id: 'settings', name: 'Settings', title: 'Less friction. More focus.', description: 'An early settings layout study. Final controls will be documented with the client release.', image: '/media/settings-concept.svg', alt: 'Clearly labelled settings layout concept with monochrome controls', status: 'Design concept' },
] as const;
