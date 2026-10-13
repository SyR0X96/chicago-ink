import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { site, waLink, telLink, mailLink, mapsLink } from './src/config.js';

// Ersetzt {{platzhalter}} in allen HTML-Seiten durch Werte aus src/config.js,
// damit Kontaktdaten auch ohne JavaScript (und für Google) im HTML stehen.
function configTokens() {
  const tokens = {
    whatsapp: waLink(),
    phone: site.phone,
    tel: telLink(),
    email: site.email,
    mailto: mailLink(),
    instagram: site.instagram,
    instagramHandle: site.instagramHandle,
    tiktok: site.tiktok,
    tiktokHandle: site.tiktokHandle,
    street: site.address.street,
    zip: site.address.zip,
    city: site.address.city,
    maps: mapsLink(),
    url: site.url,
    rating: site.rating,
    owner: site.legal.owner,
    legalForm: site.legal.legalForm,
    vatId: site.legal.vatId,
    authority: site.legal.authority,
    year: String(new Date().getFullYear()),
  };
  return {
    name: 'config-tokens',
    transformIndexHtml(html) {
      return html.replace(/\{\{(\w+)\}\}/g, (m, key) => (key in tokens ? tokens[key] : m));
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [configTokens()],
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        impressum: resolve(import.meta.dirname, 'impressum.html'),
        datenschutz: resolve(import.meta.dirname, 'datenschutz.html'),
      },
    },
  },
  server: { host: true },
});
