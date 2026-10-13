// Galerie-Daten (Titel und Stil nach Bildinhalt geprüft).
// style: realistic | blackgrey | fineline | lettering
// artist: id aus config.js – nur gesetzt, wo der Credit gesichert ist, sonst null
// featured: erscheint im großen Showcase oben (Reihenfolge)
export const gallery = [
  { slug: 'ruecken-totenkopf', title: 'Totenkopf Backpiece', place: 'Rücken', style: 'realistic', artist: null, featured: 1 },
  { slug: 'vader-fullsleeve', title: 'Darth Vader Fullsleeve', place: 'Arm', style: 'realistic', artist: null, featured: 2 },
  { slug: 'engel-backpiece', title: 'Engel Backpiece', place: 'Rücken', style: 'blackgrey', artist: null, featured: 3 },
  { slug: 'berg-wanderer', title: 'Bergpanorama mit Wanderer', place: 'Oberarm', style: 'realistic', artist: 'hermes', featured: 4 },
  { slug: 'es-pennywise', title: 'ES – Pennywise', place: 'Unterarm', style: 'realistic', artist: null, featured: 5 },
  { slug: 'wolf-fullsleeve', title: 'Wolf & Hütte Fullsleeve', place: 'Arm', style: 'blackgrey', artist: 'labon', featured: 6 },
  { slug: 'wolf-augen', title: 'Wolf im Wald', place: 'Oberarm', style: 'realistic', artist: 'hermes' },
  { slug: 'adler', title: 'Adler', place: 'Unterarm', style: 'realistic', artist: null },
  { slug: 'auge-schmetterling', title: 'Auge & Schmetterling', place: 'Dekolleté', style: 'fineline', artist: 'sava' },
  { slug: 'justitia', title: 'Justitia', place: 'Unterarm', style: 'blackgrey', artist: 'hermes' },
  { slug: 'frauengesicht', title: 'Dark Portrait', place: 'Oberarm', style: 'realistic', artist: 'labon' },
  { slug: 'loewe-mit-jungen', title: 'Löwe mit Jungen', place: 'Oberarm', style: 'blackgrey', artist: null },
  { slug: 'fc-koeln', title: '1. FC Köln & Dom', place: 'Oberarm', style: 'blackgrey', artist: 'labon' },
  { slug: 'anubis', title: 'Anubis mit Rot-Akzenten', place: 'Unterarm', style: 'realistic', artist: null },
  { slug: 'motorradfahrer', title: 'Biker auf Landstraße', place: 'Unterarm', style: 'realistic', artist: 'hermes' },
  { slug: 'i-am-enough', title: '„I am enough“', place: 'Oberarm', style: 'lettering', artist: null },
  { slug: 'erzengel', title: 'Erzengel', place: 'Oberarm', style: 'blackgrey', artist: null },
  { slug: 'portrait-zigarre', title: 'Porträt mit Zigarre', place: 'Unterarm', style: 'realistic', artist: 'labon' },
  { slug: 'schwarze-witwe', title: 'Schwarze Witwe 3D', place: 'Unterarm', style: 'realistic', artist: null },
  { slug: 'zeus', title: 'Gott des Donners', place: 'Unterarm', style: 'blackgrey', artist: 'labon' },
  { slug: 'baer', title: 'Brüllender Bär', place: 'Brust', style: 'realistic', artist: null },
  { slug: 'anime-bein', title: 'Anime Linework', place: 'Wade', style: 'fineline', artist: null },
  { slug: 'kinderportraet', title: 'Kinderporträt', place: 'Unterarm', style: 'realistic', artist: null },
  { slug: 'yoda', title: 'Yoda mit Schriftzug', place: 'Unterarm', style: 'realistic', artist: null },
  { slug: 'wildschwein', title: 'Keiler & Hochsitz', place: 'Arm', style: 'realistic', artist: null },
  { slug: 'krieger', title: 'Krieger', place: 'Oberarm', style: 'blackgrey', artist: null },
  { slug: 'huette-hund-sleeve', title: 'Hütte, Berge & Hund', place: 'Arm', style: 'realistic', artist: null },
  { slug: 'berg-huette-sleeve', title: 'Berge & Hütte Sleeve', place: 'Arm', style: 'blackgrey', artist: null },
  { slug: 'leguan', title: 'Leguan', place: 'Schulter', style: 'realistic', artist: null },
  { slug: 'fullsleeve-seite', title: 'Fullsleeve', place: 'Arm', style: 'blackgrey', artist: null },
  { slug: 'vader-sleeve-detail', title: 'Darth Vader Detail', place: 'Oberarm', style: 'realistic', artist: null },
];

export const styleLabels = {
  realistic: 'Realistic',
  blackgrey: 'Black & Grey',
  fineline: 'Fineline & Linework',
  lettering: 'Lettering',
};
