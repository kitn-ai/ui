export type Category =
  | 'Outerwear'
  | 'Tailoring'
  | 'Knitwear'
  | 'Eveningwear'
  | 'Leather'
  | 'Accessories';

export interface Colorway {
  name: string;
  hex: string;
  /** Its own photograph. Falls back to the piece's when a colorway has none. */
  image?: string;
}

export interface Piece {
  id: string;
  slug: string;
  name: string;
  price: number;
  category: Category;
  colorways: Colorway[];
  sizes: string[];
  /** One line for the catalog card. */
  blurb: string;
  /** The paragraph on the product page. */
  description: string;
  fabric: string;
  measurements: string;
  image: string;
}

/** A garment marked on a look, positioned in percentages of the photograph. */
export interface Hotspot {
  x: number;
  y: number;
  pieceId: string;
}

export interface Look {
  id: string;
  slug: string;
  title: string;
  caption: string;
  /** Editorial note on the look detail page. */
  note: string;
  image: string;
  category: Category;
  hotspots: Hotspot[];
}

export interface Material {
  id: string;
  name: string;
  origin: string;
  copy: string;
  image: string;
}

export interface TimelineEntry {
  year: string;
  title: string;
  body: string;
}
