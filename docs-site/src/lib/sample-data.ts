// Per-element sample data for NON-scalar props (arrays/objects like `items`,
// `messages`, `sources`, `files`) — the one thing element-meta can't provide.
//
// Each element contributes ONE file: src/data/samples/<tag>.ts with a default
// export `{ sample, named? }`. They're auto-aggregated here via import.meta.glob,
// so the Phase-2 fan-out adds elements WITHOUT touching this shared file.

interface SampleModule {
  sample?: Record<string, unknown>;
  named?: Record<string, Record<string, unknown>>;
}

const mods = import.meta.glob<{ default: SampleModule }>('../data/samples/*.ts', { eager: true });

export const SAMPLE: Record<string, Record<string, unknown>> = {};
export const NAMED: Record<string, Record<string, Record<string, unknown>>> = {};

for (const path in mods) {
  const tag = path.split('/').pop()!.replace(/\.ts$/, '');
  const m = mods[path].default;
  if (m?.sample) SAMPLE[tag] = m.sample;
  if (m?.named) NAMED[tag] = m.named;
}

/** Resolve the sample data for a tag, optionally a named set, merged with overrides. */
export function sampleFor(tag: string, named?: string, overrides?: Record<string, unknown>): Record<string, unknown> {
  const base = SAMPLE[tag] ?? {};
  const namedSet = named ? NAMED[tag]?.[named] ?? {} : {};
  return { ...base, ...namedSet, ...(overrides ?? {}) };
}
