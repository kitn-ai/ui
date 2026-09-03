import type { Category, Piece } from './types';

/** Ordered as the shop lists them: outerwear first, accessories last. */
export const categories: Category[] = [
  'Outerwear',
  'Tailoring',
  'Knitwear',
  'Eveningwear',
  'Leather',
  'Accessories',
];

const CLOTHING_SIZES = ['XS', 'S', 'M', 'L', 'XL'];

export const catalog: Piece[] = [
  {
    id: 'p1',
    slug: 'wool-coat',
    name: 'The Wool Coat',
    price: 680,
    category: 'Outerwear',
    colorways: [
      { name: 'Charcoal', hex: '#3b3f47', image: '/img/pieces/wool-coat-charcoal.jpg' },
      { name: 'Camel', hex: '#b9966a', image: '/img/pieces/wool-coat-camel.jpg' },
      { name: 'Ivory', hex: '#ece7dc', image: '/img/pieces/wool-coat-ivory.jpg' },
      { name: 'Black', hex: '#1a1c20', image: '/img/pieces/wool-coat-black.jpg' },
    ],
    sizes: CLOTHING_SIZES,
    blurb: 'Double-faced wool, dropped shoulder, collarless.',
    description:
      'A double-faced wool coat with a softly dropped shoulder and a clean, collarless line. Fully lined, cut in a small atelier in northern Italy. It holds its shape without structure, which is the whole point of the cloth.',
    fabric: '92% virgin wool, 8% cashmere. Double-faced, woven in Biella.',
    measurements:
      'Size M: 118cm length, 52cm across the shoulder, 62cm sleeve. Model is 178cm and wears M.',
    image: '/img/pieces/wool-coat-charcoal.jpg',
  },
  {
    id: 'p2',
    slug: 'draped-knit',
    name: 'The Draped Knit',
    price: 340,
    category: 'Knitwear',
    colorways: [
      { name: 'Ash', hex: '#7d818a', image: '/img/pieces/draped-knit-ash.jpg' },
      { name: 'Ivory', hex: '#ece7dc' },
    ],
    sizes: CLOTHING_SIZES,
    blurb: 'Fine-gauge merino that falls rather than hangs.',
    description:
      'Knitted in one piece on a fine gauge, then washed so it falls rather than hangs. The sleeve is cut long on purpose. Wear it pushed back.',
    fabric: '100% extra-fine merino, 14 gauge. Knitted in Portugal.',
    measurements: 'Size M: 68cm length, 64cm sleeve. Relaxed through the body.',
    image: '/img/pieces/draped-knit-ash.jpg',
  },
  {
    id: 'p3',
    slug: 'silk-slip',
    name: 'The Silk Slip',
    price: 420,
    category: 'Eveningwear',
    colorways: [
      { name: 'Pearl', hex: '#ded9d0', image: '/img/pieces/silk-slip-pearl.jpg' },
      { name: 'Graphite', hex: '#4a4e57' },
    ],
    sizes: CLOTHING_SIZES,
    blurb: 'Bias-cut sandwashed silk, bare strap.',
    description:
      'Cut on the bias from sandwashed silk so it moves with the body rather than across it. The strap is single-layer and deliberately bare.',
    fabric: '100% sandwashed silk, 19 momme. Woven in Como.',
    measurements: 'Size M: 132cm length from the strap. Adjustable at the shoulder.',
    image: '/img/pieces/silk-slip-pearl.jpg',
  },
  {
    id: 'p4',
    slug: 'wide-trouser',
    name: 'The Wide Trouser',
    price: 290,
    category: 'Tailoring',
    colorways: [
      { name: 'Charcoal', hex: '#3b3f47', image: '/img/pieces/wide-trouser-charcoal.jpg' },
      { name: 'Ivory', hex: '#ece7dc' },
    ],
    sizes: ['24', '26', '28', '30', '32'],
    blurb: 'A single pleat, a long break, no taper.',
    description:
      'One pleat, a high waist and no taper at all. Cut long so it breaks on the shoe. The cloth is a dry wool that creases the way tailoring should.',
    fabric: '100% dry-finish virgin wool. Woven in Huddersfield.',
    measurements: 'Size 28: 112cm inseam, 28cm leg opening, 31cm rise.',
    image: '/img/pieces/wide-trouser-charcoal.jpg',
  },
  {
    id: 'p5',
    slug: 'leather-blouson',
    name: 'The Leather Blouson',
    price: 890,
    category: 'Leather',
    colorways: [
      { name: 'Black', hex: '#1a1c20', image: '/img/pieces/leather-blouson-black.jpg' },
      { name: 'Bone', hex: '#d9d3c7' },
    ],
    sizes: CLOTHING_SIZES,
    blurb: 'Vegetable-tanned lambskin, cropped and unlined.',
    description:
      'Vegetable-tanned lambskin, cropped at the hip and left unlined so it takes the shape of whoever wears it. It will mark. That is the material telling the truth.',
    fabric: 'Vegetable-tanned lambskin, 0.7mm. Tanned in Tuscany.',
    measurements: 'Size M: 56cm length, 46cm across the shoulder.',
    image: '/img/pieces/leather-blouson-black.jpg',
  },
  {
    id: 'p6',
    slug: 'column-dress',
    name: 'The Column Dress',
    price: 560,
    category: 'Eveningwear',
    colorways: [
      { name: 'Black', hex: '#1a1c20', image: '/img/pieces/column-dress-black.jpg' },
      { name: 'Pearl', hex: '#ded9d0' },
    ],
    sizes: CLOTHING_SIZES,
    blurb: 'Floor-length crepe, one seam, no closure.',
    description:
      'A floor-length column in heavy crepe with a single seam down the back and no closure. It goes on over the head, which is the most quietly luxurious thing a dress can do.',
    fabric: '100% wool crepe, heavyweight. Woven in Como.',
    measurements: 'Size M: 148cm length. Straight through the hip.',
    image: '/img/pieces/column-dress-black.jpg',
  },
  {
    id: 'p7',
    slug: 'overshirt',
    name: 'The Overshirt',
    price: 310,
    category: 'Tailoring',
    colorways: [
      { name: 'Ash', hex: '#7d818a', image: '/img/pieces/overshirt-ash.jpg' },
      { name: 'Charcoal', hex: '#3b3f47' },
    ],
    sizes: CLOTHING_SIZES,
    blurb: 'Brushed wool, patch pockets, worn open.',
    description:
      'Brushed wool cut as a shirt but sized as a jacket. Two patch pockets, horn buttons, meant to be worn open over the knit.',
    fabric: '80% wool, 20% cotton, brushed. Woven in Japan.',
    measurements: 'Size M: 74cm length, 54cm across the shoulder.',
    image: '/img/pieces/overshirt-ash.jpg',
  },
  {
    id: 'p8',
    slug: 'cashmere-scarf',
    name: 'The Cashmere Scarf',
    price: 180,
    category: 'Accessories',
    colorways: [
      { name: 'Ivory', hex: '#ece7dc', image: '/img/pieces/cashmere-scarf-ivory.jpg' },
      { name: 'Charcoal', hex: '#3b3f47' },
    ],
    sizes: ['One size'],
    blurb: 'Two-ply cashmere, raw edge, oversized.',
    description:
      'Two-ply cashmere, woven wide and finished with a raw edge. Long enough to wear doubled, light enough not to notice.',
    fabric: '100% two-ply cashmere. Woven in Scotland.',
    measurements: '200cm by 70cm. Raw edge on all four sides.',
    image: '/img/pieces/cashmere-scarf-ivory.jpg',
  },
];

export const pieceBySlug = (slug: string): Piece | undefined =>
  catalog.find((p) => p.slug === slug);

export const pieceById = (id: string): Piece | undefined =>
  catalog.find((p) => p.id === id);

/** Every colorway carries a photograph: its own, or the piece's. */
export const colorwayImage = (piece: Piece, colorwayName: string): string =>
  piece.colorways.find((c) => c.name === colorwayName)?.image ?? piece.image;

export const priceBounds = (): [number, number] => [
  Math.min(...catalog.map((p) => p.price)),
  Math.max(...catalog.map((p) => p.price)),
];
