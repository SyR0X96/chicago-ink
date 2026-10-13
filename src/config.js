// ============================================================================
//  ZENTRALE KONFIGURATION – hier alle Kontaktdaten pflegen.
//  Änderungen wirken überall: Buttons, Links, Konfigurator, Impressum.
// ============================================================================

export const site = {
  name: 'Chicago Ink Erftstadt',
  url: 'https://chicago-ink.de',

  // TODO: echte WhatsApp-Nummer eintragen – nur Ziffern, mit Ländervorwahl, ohne + und ohne 0
  // Beispiel: 0171 2345678  →  '491712345678'
  whatsapp: '491234567890',

  // TODO: echte Telefonnummer eintragen
  phone: '+49 123 4567890',

  email: 'chicagoinkeurope@gmail.com',
  instagram: 'https://www.instagram.com/chicagoink1/',
  instagramHandle: '@chicagoink1',
  tiktok: 'https://www.tiktok.com/@chicago.ink.erfts',
  tiktokHandle: '@chicago.ink.erfts',

  // Optional: Link zu euren Google-Bewertungen (leer lassen = Button wird ausgeblendet)
  googleReviews: '',

  address: {
    street: 'Gymnicher Hauptstraße 33a',
    zip: '50374',
    city: 'Erftstadt',
  },

  // Wochentage: 0 = Sonntag … 6 = Samstag. null = geschlossen
  hours: {
    1: ['12:00', '18:00'],
    2: ['12:00', '18:00'],
    3: ['09:00', '17:00'],
    4: ['09:00', '17:00'],
    5: ['09:00', '17:00'],
    6: ['09:00', '17:00'],
    0: null,
  },

  rating: '4,9',

  // Impressum – TODO: echte Angaben eintragen (Pflicht nach § 5 DDG)
  legal: {
    owner: '[Vor- und Nachname Inhaber:in]',
    legalForm: '[Rechtsform, z. B. Einzelunternehmen]',
    vatId: '[USt-IdNr. falls vorhanden]',
    authority: '[Zuständige Aufsichtsbehörde / Gewerbeamt Erftstadt]',
  },
};

export const artists = [
  {
    id: 'sava',
    name: 'Sava',
    role: 'Tattoo Artist',
    styles: ['Fineline', 'Linework', 'Filigran'],
    bio: 'Feine Linien und filigrane Motive – zart, präzise und zeitlos.',
    instagram: 'https://www.instagram.com/tattoo_savana/',
    handle: '@tattoo_savana',
    photo: 'sava',
  },
  {
    id: 'hermes',
    name: 'Hermes',
    alias: 'Hubert',
    role: 'Tattoo Artist',
    styles: ['Realistic', 'Black & Grey', 'Landschaften'],
    bio: 'Realistische Landschaften, Tiere und große Projekte. Nimmt sich Zeit für jeden Entwurf – bis er wirklich sitzt.',
    instagram: 'https://www.instagram.com/hermes.art.tattoo/',
    handle: '@hermes.art.tattoo',
    photo: 'hermes',
  },
  {
    id: 'labon',
    name: 'Labon',
    role: 'Tattoo Artist',
    styles: ['Black & Grey', 'Realistic', 'Portraits'],
    bio: 'Black & Grey und Realistic mit Tiefe: Porträts, Sleeves und Motive mit starkem Kontrast.',
    instagram: '',
    handle: '',
    photo: null,
  },
  {
    id: 'tanja',
    name: 'Tanja',
    role: 'Storemanagerin',
    styles: ['Termine', 'Beratung', 'Piercing-Anfragen'],
    bio: 'Dein erster Kontakt im Studio: Termine, Fragen, Organisation – und dafür, dass du dich vom ersten Moment an wohlfühlst.',
    instagram: 'https://www.instagram.com/tanja.einfach.leben/',
    handle: '@tanja.einfach.leben',
    photo: 'tanja',
  },
];

// ---------------------------------------------------------------------------
//  Hilfsfunktionen
// ---------------------------------------------------------------------------

export const waLink = (text = '') =>
  `https://wa.me/${site.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ''}`;

export const telLink = () => `tel:${site.phone.replace(/[^\d+]/g, '')}`;

export const mailLink = (subject = '', body = '') => {
  const q = new URLSearchParams();
  if (subject) q.set('subject', subject);
  if (body) q.set('body', body);
  const qs = q.toString().replace(/\+/g, '%20');
  return `mailto:${site.email}${qs ? `?${qs}` : ''}`;
};

export const mapsLink = () =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${site.address.street}, ${site.address.zip} ${site.address.city}`
  )}`;
