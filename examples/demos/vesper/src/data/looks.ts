import type { Look } from './types';

/** The AW26 lookbook. Hotspot coordinates are percentages of the photograph. */
export const looks: Look[] = [
  {
    id: 'l1',
    slug: 'the-opening-look',
    title: 'The Opening Look',
    caption: 'Look 01 / The Wool Coat',
    note: 'The coat, worn open over nothing much. Shot at first light on the Estrela side of the city.',
    image: '/img/looks/look-01.jpg',
    category: 'Outerwear',
    hotspots: [
      { x: 50, y: 42, pieceId: 'p1' },
      { x: 44, y: 78, pieceId: 'p4' },
    ],
  },
  {
    id: 'l2',
    slug: 'draped-knit',
    title: 'Draped Knit',
    caption: 'Look 02 / Draped Knit',
    note: 'Sleeves pushed back, hem left long. The knit is doing all of the work.',
    image: '/img/looks/look-02.jpg',
    category: 'Knitwear',
    hotspots: [
      { x: 52, y: 46, pieceId: 'p2' },
      { x: 48, y: 82, pieceId: 'p4' },
    ],
  },
  {
    id: 'l3',
    slug: 'eveningwear',
    title: 'Eveningwear',
    caption: 'Look 03 / Eveningwear',
    note: 'The slip, and a scarf carried rather than worn.',
    image: '/img/looks/look-03.jpg',
    category: 'Eveningwear',
    hotspots: [
      { x: 50, y: 52, pieceId: 'p3' },
      { x: 66, y: 70, pieceId: 'p8' },
    ],
  },
  {
    id: 'l4',
    slug: 'the-long-line',
    title: 'The Long Line',
    caption: 'Look 04 / The Long Line',
    note: 'Column dress, no jewellery, no closure. One seam down the back.',
    image: '/img/looks/look-04.jpg',
    category: 'Eveningwear',
    hotspots: [{ x: 50, y: 55, pieceId: 'p6' }],
  },
  {
    id: 'l5',
    slug: 'blouson',
    title: 'Blouson',
    caption: 'Look 05 / Blouson',
    note: 'Unlined lambskin over the silk. It will mark within a season, and should.',
    image: '/img/looks/look-05.jpg',
    category: 'Leather',
    hotspots: [
      { x: 50, y: 40, pieceId: 'p5' },
      { x: 50, y: 74, pieceId: 'p3' },
    ],
  },
  {
    id: 'l6',
    slug: 'the-pleat',
    title: 'The Pleat',
    caption: 'Look 06 / The Pleat',
    note: 'One pleat, a long break, and the overshirt worn open over it.',
    image: '/img/looks/look-06.jpg',
    category: 'Tailoring',
    hotspots: [
      { x: 52, y: 38, pieceId: 'p7' },
      { x: 48, y: 76, pieceId: 'p4' },
    ],
  },
  {
    id: 'l7',
    slug: 'studio-light',
    title: 'Studio Light',
    caption: 'Look 07 / Studio Light',
    note: 'The coat in camel, photographed flat-lit against white.',
    image: '/img/looks/look-07.jpg',
    category: 'Outerwear',
    hotspots: [{ x: 50, y: 46, pieceId: 'p1' }],
  },
  {
    id: 'l8',
    slug: 'the-scarf',
    title: 'The Scarf',
    caption: 'Look 08 / The Scarf',
    note: 'Two metres of cashmere, worn doubled and left loose.',
    image: '/img/looks/look-08.jpg',
    category: 'Accessories',
    hotspots: [
      { x: 50, y: 34, pieceId: 'p8' },
      { x: 50, y: 66, pieceId: 'p2' },
    ],
  },
  {
    id: 'l9',
    slug: 'overshirt-open',
    title: 'Overshirt, Open',
    caption: 'Look 09 / Overshirt, Open',
    note: 'Brushed wool, horn buttons, none of them fastened.',
    image: '/img/looks/look-09.jpg',
    category: 'Tailoring',
    hotspots: [{ x: 50, y: 44, pieceId: 'p7' }],
  },
  {
    id: 'l10',
    slug: 'bias',
    title: 'Bias',
    caption: 'Look 10 / Bias',
    note: 'The slip alone, shot moving. Bias cloth only reads honestly in motion.',
    image: '/img/looks/look-10.jpg',
    category: 'Eveningwear',
    hotspots: [{ x: 50, y: 50, pieceId: 'p3' }],
  },
  {
    id: 'l11',
    slug: 'the-second-skin',
    title: 'The Second Skin',
    caption: 'Look 11 / The Second Skin',
    note: 'Merino against the light, where the gauge becomes visible.',
    image: '/img/looks/look-11.jpg',
    category: 'Knitwear',
    hotspots: [{ x: 50, y: 48, pieceId: 'p2' }],
  },
  {
    id: 'l12',
    slug: 'closing',
    title: 'Closing',
    caption: 'Look 12 / Closing',
    note: 'The coat and the trouser, walked out at the end of the show.',
    image: '/img/looks/look-12.jpg',
    category: 'Outerwear',
    hotspots: [
      { x: 50, y: 40, pieceId: 'p1' },
      { x: 48, y: 80, pieceId: 'p4' },
    ],
  },
];

export const lookBySlug = (slug: string): Look | undefined =>
  looks.find((l) => l.slug === slug);

export const lookIndex = (slug: string): number =>
  looks.findIndex((l) => l.slug === slug);

/** Wraps at both ends, so the detail page never shows a dead arrow. */
export const adjacentLooks = (slug: string): { prev: Look; next: Look } | undefined => {
  const i = lookIndex(slug);
  if (i < 0) return undefined;
  return {
    prev: looks[(i - 1 + looks.length) % looks.length]!,
    next: looks[(i + 1) % looks.length]!,
  };
};
