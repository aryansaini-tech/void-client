import {defineConfig} from 'vite';

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  build: {
    rollupOptions: { external: ['/void/taste/moments/moments.js'] },
  },
  server: {
    strictPort: true,
    // Screenshots and copied font assets do not need live file watchers.
    // On Windows, a newly downloaded font license can briefly be locked.
    watch: { ignored: ['**/qa/**', '**/public/void/fonts/**'] },
  },
});
