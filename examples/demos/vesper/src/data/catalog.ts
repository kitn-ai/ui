import type { Category, Piece } from './types';

/**
 * The collection is written FROM the photographs, not the other way round.
 * Every name, colorway and description below describes what is actually in
 * its image -- a piece called "Camel" over a photograph of a black coat is a
 * lie the reader spots immediately, and it was the first thing anyone noticed
 * about the earlier draft. When a photograph changes, the copy changes with it.
 */
export const categories: Category[] = ['Outerwear', 'Tailoring', 'Eveningwear'];

const CLOTHING_SIZES = ['XS', 'S', 'M', 'L', 'XL'];

export const catalog: Piece[] = [
  {
    id: 'p1',
    slug: 'the-coat',
    name: 'The Coat',
    price: 680,
    category: 'Outerwear',
    // Four colorways, four photographs, each one actually that colour.
    colorways: [
      { name: 'Grey', hex: '#8a8d94', image: '/img/pieces/coat-grey.jpg' },
      { name: 'Charcoal', hex: '#3b3f47', image: '/img/pieces/coat-charcoal.jpg' },
      { name: 'Ivory', hex: '#ece7dc', image: '/img/pieces/coat-ivory.jpg' },
      { name: 'Black', hex: '#1a1c20', image: '/img/pieces/coat-black.jpg' },
    ],
    sizes: CLOTHING_SIZES,
    blurb: 'Double-faced wool, dropped shoulder, worn open.',
    description:
      'A double-faced wool coat with a softly dropped shoulder and a clean, collarless line. Cut long and meant to be worn open, which is why there is no closure to speak of. Fully finished by hand at every edge.',
    fabric: '92% virgin wool, 8% cashmere. Double-faced, woven in Biella.',
    measurements:
      'Size M: 118cm length, 52cm across the shoulder, 62cm sleeve. Model is 178cm and wears M.',
    image: '/img/pieces/coat-grey.jpg',
  },
  {
    id: 'p2',
    slug: 'sculpted-jacket',
    name: 'The Sculpted Jacket',
    price: 890,
    category: 'Outerwear',
    colorways: [{ name: 'Black', hex: '#1a1c20', image: '/img/pieces/sculpted-jacket-black.jpg' }],
    sizes: CLOTHING_SIZES,
    blurb: 'A wide, architectural sleeve in dry black wool.',
    description:
      'The sleeve is the whole garment: cut wide and set low so it holds a shape away from the body. Dry-finished wool, because a softer cloth would collapse the line the moment it was worn.',
    fabric: '100% dry-finish virgin wool, heavyweight. Woven in Biella.',
    measurements: 'Size M: 64cm length, 78cm sleeve at the widest point.',
    image: '/img/pieces/sculpted-jacket-black.jpg',
  },
  {
    id: 'p3',
    slug: 'ivory-suit',
    name: 'The Ivory Suit',
    price: 760,
    category: 'Tailoring',
    colorways: [{ name: 'Ivory', hex: '#ece7dc', image: '/img/pieces/suit-ivory.jpg' }],
    sizes: CLOTHING_SIZES,
    blurb: 'Single-breasted jacket and a matching wide trouser.',
    description:
      'Sold as a suit because it was cut as one: a single-breasted jacket with a long lapel over a wide, flat-fronted trouser, both in the same ivory wool. Ivory is unforgiving, so every seam inside is bound.',
    fabric: '100% virgin wool, mid-weight. Woven in Huddersfield.',
    measurements: 'Size M: jacket 72cm length; trouser 110cm inseam, 27cm leg opening.',
    image: '/img/pieces/suit-ivory.jpg',
  },
  {
    id: 'p4',
    slug: 'wide-trouser',
    name: 'The Wide Trouser',
    price: 290,
    category: 'Tailoring',
    colorways: [{ name: 'Black', hex: '#1a1c20', image: '/img/pieces/wide-trouser-black.jpg' }],
    sizes: ['24', '26', '28', '30', '32'],
    blurb: 'A single pleat, a long break, no taper.',
    description:
      'One pleat, a high waist and no taper at all. Cut long so it breaks on the shoe. The cloth is a dry wool that creases the way tailoring should.',
    fabric: '100% dry-finish virgin wool. Woven in Huddersfield.',
    measurements: 'Size 28: 112cm inseam, 28cm leg opening, 31cm rise.',
    image: '/img/pieces/wide-trouser-black.jpg',
  },
  {
    id: 'p5',
    slug: 'sculpted-shirt',
    name: 'The Sculpted Shirt',
    price: 340,
    category: 'Tailoring',
    colorways: [{ name: 'Ivory', hex: '#ece7dc', image: '/img/pieces/sculpted-shirt-ivory.jpg' }],
    sizes: CLOTHING_SIZES,
    blurb: 'Heavy cotton poplin folded into a standing collar.',
    description:
      'A shirt in name only. Heavy cotton poplin, pressed and folded into a collar that stands away from the neck and holds its own angle all day. There is one button.',
    fabric: '100% cotton poplin, 170gsm. Woven in Japan.',
    measurements: 'Size M: 66cm length, 22cm collar height at the point.',
    image: '/img/pieces/sculpted-shirt-ivory.jpg',
  },
  {
    id: 'p6',
    slug: 'the-slip',
    name: 'The Slip',
    price: 320,
    category: 'Eveningwear',
    colorways: [{ name: 'Black', hex: '#1a1c20', image: '/img/pieces/slip-black.jpg' }],
    sizes: CLOTHING_SIZES,
    blurb: 'Bias-cut sandwashed silk, bare strap.',
    description:
      'Cut on the bias from sandwashed silk so it moves with the body rather than across it. The strap is single-layer and deliberately bare. Meant to be worn out, not under.',
    fabric: '100% sandwashed silk, 19 momme. Woven in Como.',
    measurements: 'Size M: 132cm length from the strap. Adjustable at the shoulder.',
    image: '/img/pieces/slip-black.jpg',
  },
  {
    id: 'p7',
    slug: 'belted-dress',
    name: 'The Belted Dress',
    price: 560,
    category: 'Eveningwear',
    colorways: [{ name: 'Ivory', hex: '#ece7dc', image: '/img/pieces/belted-dress-ivory.jpg' }],
    sizes: CLOTHING_SIZES,
    blurb: 'Ivory crepe, off the shoulder, cut wide at the waist.',
    description:
      'Ivory crepe gathered off the shoulder and cut full through the skirt, then taken back in by a wide black belt. The belt is the piece; without it the dress is a column.',
    fabric: '100% wool crepe, heavyweight. Woven in Como. Belt: vegetable-tanned calf.',
    measurements: 'Size M: 96cm length. Belt 9cm wide, five holes.',
    image: '/img/pieces/belted-dress-ivory.jpg',
  },
  {
    id: 'p8',
    slug: 'lace-bustier',
    name: 'The Lace Bustier',
    price: 420,
    category: 'Eveningwear',
    colorways: [{ name: 'Black on ivory', hex: '#1a1c20', image: '/img/pieces/lace-bustier-black.jpg' }],
    sizes: CLOTHING_SIZES,
    blurb: 'Black guipure laid over an ivory ground.',
    description:
      'Black guipure lace laid over ivory silk and cut so the pattern reads as a single scalloped band across the body. Boned lightly through the front; it holds without gripping.',
    fabric: 'Guipure lace over 100% silk. Lace made in Calais.',
    measurements: 'Size M: 38cm length at the centre front.',
    image: '/img/pieces/lace-bustier-black.jpg',
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
