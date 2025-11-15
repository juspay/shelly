import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),

  kit: {
    adapter: adapter(),
    alias: {
      $lib: 'src/lib',
      $components: 'src/lib/components',
      $utils: 'src/lib/utils',
      $stores: 'src/lib/stores',
    },
  },

  compilerOptions: {
    // Svelte 5 runes mode enabled (recommended for new projects as of October 2024)
    // Runes are the modern reactivity pattern in Svelte 5
    // For Svelte 4 compatibility, set this to false
    runes: true,
  },
};

export default config;
