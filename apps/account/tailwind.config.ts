import type { Config } from 'tailwindcss';
import shared from '../../packages/config/tailwind';
export default { presets: [shared], content: ['./src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'] } satisfies Config;

