/**
 * THE DATA-MODE SEAM, resolved (spec 4, "three modes, one axis").
 *
 * A block's controller imports ONE extensionless specifier (`./assistant.transport`)
 * and the manifest declares which authored source each data mode puts at that
 * name (`wiring.modeFiles`) plus the name itself (`wiring.modeTarget`). This
 * module is the ONE place that turns "this block, this mode" into a `Block` the
 * renderers can emit: exactly one variant is written at the target, the other
 * variants and the declared mock files are not written at all.
 *
 * WHY THE RENDERERS AND NOT ONLY THE CLI. The compile cells compile what the
 * generator emitted, and a mock-free tree that is never emitted is never
 * compiled -- which is how "mock mode works, and `--no-mock` refuses for every
 * block" stayed invisible. So the mode is an argument to the form renderers, and
 * `create-kai add`, the generator and the cells all go through them.
 *
 * NO `node:*`, pure, over the injected block -- the same discipline as the rest
 * of this package: `create-kai` bundles this source into its CLI and a browser
 * walks it on the /blocks page.
 */
import type { Block, BlockManifest, DataMode } from '../registry';

/** The mode a caller that does not say means: the scripted demo. */
export const DEFAULT_DATA_MODE: DataMode = 'mock';

/** `<name>.ts` -> `<name>.js`: the stripped twin every form ships beside a
 *  TypeScript source. The strip itself happens once, upstream (gen-blocks.mjs /
 *  create-kai's build), so a resolved twin is COPIED here, never produced. */
const twinOf = (path: string): string => path.replace(/\.ts$/, '.js');

/**
 * Resolve one block for one data mode.
 *
 * The result is a RESOLVED tree, and it says so: `wiring` comes back without
 * `modeFiles`/`modeTarget` (the axis is spent) and without `mockFiles` (the
 * files they named are gone). That is why applying a mode twice is a no-op
 * rather than a second swap with nothing left to swap -- and why
 * `applyDataMode` can be called by a renderer without knowing whether its caller
 * already resolved the block.
 *
 * A block with NO seam is returned unchanged: it can only be installed as the
 * mock, and the CLI refuses a mock-free install by name (`assertMockUnreferenced`
 * in create-kai) instead of shipping a tree that cannot resolve its imports.
 */
export function applyDataMode(block: Block, mode: DataMode): Block {
  const wiring = block.manifest.wiring;
  const modeFiles = wiring?.modeFiles;
  if (!modeFiles) return block;

  const target = wiring?.modeTarget;
  if (!target) {
    throw new Error(
      `${block.name}: wiring.modeFiles is declared without wiring.modeTarget, so there is no name to write the "${mode}" file at`,
    );
  }
  const variant = modeFiles[mode];
  if (!variant) {
    throw new Error(
      `${block.name} has no "${mode}" data mode: its wiring.modeFiles declares ${Object.keys(modeFiles).join(', ') || 'nothing'}. ` +
        `Install it in one of those modes, or add a source for this one (packages/blocks/src/registry.ts documents the four fields).`,
    );
  }
  const content = block.files.get(variant);
  if (content === undefined) {
    throw new Error(
      `${block.name}: wiring.modeFiles.${mode} names "${variant}", which the block does not ship; the item is incomplete, so this mode cannot be written`,
    );
  }

  // Everything the chosen mode does NOT ship: the other variants (authored
  // sources, never shipped under their own names) and, in the two mock-free
  // modes, the files the manifest declares mock-only. Each with its stripped
  // twin, because which of the two a form emits depends on the form: the html
  // form ships `<name>.js`, the react form the `<name>.ts` source.
  const dropped = new Set<string>();
  for (const path of Object.values(modeFiles)) {
    dropped.add(path);
    dropped.add(twinOf(path));
  }
  if (mode !== 'mock') {
    for (const path of wiring?.mockFiles ?? []) {
      dropped.add(path);
      dropped.add(twinOf(path));
    }
  }

  const files = new Map(block.files);
  for (const path of dropped) files.delete(path);
  files.set(target, content);
  // The twin travels with the source when the block carries one (a built tree
  // does; an authored, unstripped one does not, and its caller strips after
  // this). The form that needs it reads it where the renderers already look.
  const targetTwin = twinOf(target);
  const twinContent = block.files.get(twinOf(variant));
  if (targetTwin !== target && twinContent !== undefined) files.set(targetTwin, twinContent);

  const manifestFiles = block.manifest.files.filter((entry) => !dropped.has(entry.path));
  manifestFiles.push({ path: target, type: 'registry:file' });
  if (files.has(targetTwin) && targetTwin !== target) manifestFiles.push({ path: targetTwin, type: 'registry:file' });

  const resolvedWiring: BlockManifest['wiring'] =
    wiring?.gateways === undefined ? undefined : { gateways: wiring.gateways };
  return { name: block.name, files, manifest: { ...block.manifest, files: manifestFiles, wiring: resolvedWiring } };
}
