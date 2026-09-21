import type { Look } from './types';

/**
 * Like the catalog, written FROM the photographs. A look's title, note and
 * category describe the frame it sits on, and its hotspots point only at
 * pieces actually visible in it.
 */
export const looks: Look[] = [
  {
    id: 'l1',
    slug: 'the-opening-look',
    title: 'The Opening Look',
    caption: 'Look 01 / The Coat',
    note: 'The coat in grey herringbone, worn open over black. Shot at first light on the Estrela side of the city.',
    image: '/img/looks/look-01.jpg',
    category: 'Outerwear',
    hotspots: [
      { x: 32, y: 38, pieceId: 'p1' },
      { x: 52, y: 82, pieceId: 'p4' },
    ],
  },
  {
    id: 'l2',
    slug: 'off-the-shoulder',
    title: 'Off the Shoulder',
    caption: 'Look 02 / The Slip',
    note: 'The silk slip and nothing else, against a dark ground. One ring, no other jewellery.',
    image: '/img/looks/look-02.jpg',
    category: 'Eveningwear',
    hotspots: [{ x: 46, y: 72, pieceId: 'p6' }],
  },
  {
    id: 'l3',
    slug: 'hands',
    title: 'Hands',
    caption: 'Look 03 / The Slip',
    note: 'Bare shoulders, hands brought up to the collarbone. The cloth is doing almost nothing, which is the point.',
    image: '/img/looks/look-03.jpg',
    category: 'Eveningwear',
    hotspots: [{ x: 50, y: 78, pieceId: 'p6' }],
  },
  {
    id: 'l4',
    slug: 'volume',
    title: 'Volume',
    caption: 'Look 04 / The Lace Bustier',
    note: 'The bustier under a black tulle skirt, arms raised. Everything above the waist is held; everything below is not.',
    image: '/img/looks/look-04.jpg',
    category: 'Eveningwear',
    hotspots: [{ x: 50, y: 44, pieceId: 'p8' }],
  },
  {
    id: 'l5',
    slug: 'the-sculpted-sleeve',
    title: 'The Sculpted Sleeve',
    caption: 'Look 05 / The Sculpted Jacket',
    note: 'Photographed mid-turn against white, because the sleeve only reads as a shape when it moves.',
    image: '/img/looks/look-05.jpg',
    category: 'Outerwear',
    hotspots: [{ x: 48, y: 46, pieceId: 'p2' }],
  },
  {
    id: 'l6',
    slug: 'black-tailoring',
    title: 'Black Tailoring',
    caption: 'Look 06 / The Wide Trouser',
    note: 'A black jacket worn closed over the wide trouser. Shot flat and straight on, no styling at all.',
    image: '/img/looks/look-06.jpg',
    category: 'Tailoring',
    hotspots: [{ x: 50, y: 74, pieceId: 'p4' }],
  },
  {
    id: 'l7',
    slug: 'studio-light',
    title: 'Studio Light',
    caption: 'Look 07 / The Coat',
    note: 'The coat in black, caught mid-step under a hard studio light against white.',
    image: '/img/looks/look-07.jpg',
    category: 'Outerwear',
    hotspots: [
      { x: 50, y: 42, pieceId: 'p1' },
      { x: 56, y: 84, pieceId: 'p4' },
    ],
  },
  {
    id: 'l8',
    slug: 'the-collar',
    title: 'The Collar',
    caption: 'Look 08 / The Sculpted Shirt',
    note: 'The standing collar, worn under a wide brim. Poplin pressed hard enough to hold its own angle.',
    image: '/img/looks/look-08.jpg',
    category: 'Tailoring',
    hotspots: [{ x: 46, y: 72, pieceId: 'p5' }],
  },
  {
    id: 'l9',
    slug: 'layers',
    title: 'Layers',
    caption: 'Look 09 / The Sculpted Shirt',
    note: 'Ivory poplin under black wool, both cut wide, photographed on the street rather than in the studio.',
    image: '/img/looks/look-09.jpg',
    category: 'Tailoring',
    hotspots: [{ x: 44, y: 46, pieceId: 'p5' }],
  },
  {
    id: 'l10',
    slug: 'ivory',
    title: 'Ivory',
    caption: 'Look 10 / The Ivory Suit',
    note: 'The whole suit, walked. Ivory tailoring photographed against grey so the cloth keeps its weight.',
    image: '/img/looks/look-10.jpg',
    category: 'Tailoring',
    hotspots: [
      { x: 50, y: 40, pieceId: 'p3' },
      { x: 46, y: 80, pieceId: 'p3' },
    ],
  },
  {
    id: 'l11',
    slug: 'the-ball',
    title: 'The Ball',
    caption: 'Look 11 / The Lace Bustier',
    note: 'The closing eveningwear frame: the bustier over full tulle, hair set high. The one excessive look in the collection.',
    image: '/img/looks/look-11.jpg',
    category: 'Eveningwear',
    hotspots: [{ x: 50, y: 36, pieceId: 'p8' }],
  },
  {
    id: 'l12',
    slug: 'closing',
    title: 'Closing',
    caption: 'Look 12 / The Coat',
    note: 'The coat in black with a wide brim, walked out at the end of the show.',
    image: '/img/looks/look-12.jpg',
    category: 'Outerwear',
    hotspots: [{ x: 52, y: 56, pieceId: 'p1' }],
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
