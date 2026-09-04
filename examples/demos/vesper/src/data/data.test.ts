import { describe, it, expect } from 'vitest';
import { catalog, categories, pieceById, pieceBySlug, colorwayImage } from './catalog';
import { looks, lookBySlug, adjacentLooks } from './looks';
import { materials, timeline } from './atelier';

const unique = <T>(xs: T[]) => new Set(xs).size === xs.length;

describe('catalog', () => {
  it('has unique ids and slugs', () => {
    expect(unique(catalog.map((p) => p.id))).toBe(true);
    expect(unique(catalog.map((p) => p.slug))).toBe(true);
  });

  it('only uses declared categories', () => {
    for (const p of catalog) expect(categories).toContain(p.category);
  });

  it('gives every piece colorways, sizes and an image', () => {
    for (const p of catalog) {
      expect(p.colorways.length).toBeGreaterThan(0);
      expect(p.sizes.length).toBeGreaterThan(0);
      expect(p.image).toMatch(/^\/img\/.+\.jpg$/);
      expect(p.price).toBeGreaterThan(0);
    }
  });

  it('resolves a photograph for every colorway, with or without its own', () => {
    for (const p of catalog)
      for (const c of p.colorways)
        expect(colorwayImage(p, c.name)).toMatch(/^\/img\/.+\.jpg$/);
  });

  it('looks pieces up both ways', () => {
    const first = catalog[0]!;
    expect(pieceBySlug(first.slug)?.id).toBe(first.id);
    expect(pieceById(first.id)?.slug).toBe(first.slug);
    expect(pieceBySlug('nope')).toBeUndefined();
  });

  // The mismatch this collection was rewritten to fix: a colorway called
  // "Camel" over a photograph of a black coat. A photograph's filename is
  // written from its subject, so the colorway must appear in its own path.
  it('names every colorway photograph after the colorway', () => {
    for (const p of catalog)
      for (const c of p.colorways) {
        if (!c.image) continue;
        const slug = c.name.toLowerCase().split(' ')[0]!;
        expect(c.image, `${p.name} / ${c.name}`).toContain(slug);
      }
  });
});

describe('lookbook', () => {
  it('has unique ids and slugs', () => {
    expect(unique(looks.map((l) => l.id))).toBe(true);
    expect(unique(looks.map((l) => l.slug))).toBe(true);
  });

  it('points every hotspot at a piece that exists', () => {
    for (const l of looks) {
      expect(l.hotspots.length).toBeGreaterThan(0);
      for (const h of l.hotspots) {
        expect(pieceById(h.pieceId), `${l.slug} -> ${h.pieceId}`).toBeDefined();
        expect(h.x).toBeGreaterThan(0);
        expect(h.x).toBeLessThan(100);
        expect(h.y).toBeGreaterThan(0);
        expect(h.y).toBeLessThan(100);
      }
    }
  });

  it('wraps prev/next at both ends', () => {
    const first = adjacentLooks(looks[0]!.slug)!;
    expect(first.prev.slug).toBe(looks[looks.length - 1]!.slug);
    const last = adjacentLooks(looks[looks.length - 1]!.slug)!;
    expect(last.next.slug).toBe(looks[0]!.slug);
    expect(lookBySlug('nope')).toBeUndefined();
  });
});

describe('atelier', () => {
  it('has three materials and a timeline', () => {
    expect(materials).toHaveLength(3);
    expect(timeline.length).toBeGreaterThanOrEqual(5);
    for (const m of materials) expect(m.image).toMatch(/^\/img\/.+\.jpg$/);
  });
});
