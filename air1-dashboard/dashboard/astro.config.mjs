import solidJs from '@astrojs/solid-js';
import relativeLinks from 'astro-relative-links';
// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  integrations: [
    solidJs(),
    relativeLinks(), // Convert absolute paths to relative for HA ingress iframe
  ],
  build: {
    format: 'file',
    assets: '_astro',
  },
});
