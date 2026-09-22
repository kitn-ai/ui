/**
 * `kai.json` — written in v1, read in v2.
 *
 * Nothing reads it today. It exists so a later `add` command never has to infer
 * a project's shape, which is the single thing that makes shadcn's `add`
 * tractable: the tool owns a file describing the project instead of re-deriving
 * it on every command. Thirty lines now is the difference between v2 being a
 * feature and v2 being a rewrite.
 *
 * `registration` is the field that earns its keep — `solid` for a Solid project
 * (direct component imports) and `elements` everywhere else (`kai-*` web
 * components). Inferring it after the fact means parsing the entry file.
 */
import type { FrameworkDef } from './frameworks';
import type { ProjectPlan } from './types';

/** Bumped when the shape changes incompatibly, not when a field is added. */
export const KAI_JSON_VERSION = 1;

export const KAI_JSON_SCHEMA_URL = 'https://ui.kitn.ai/schema/kai.json';

export interface KaiJson {
  $schema: string;
  version: number;
  framework: string;
  /** The `@kitn.ai/ui` range written into the emitted `package.json`. */
  kit: string;
  /**
   * The exact `@kitn.ai/ui` version the CLI that wrote this file was built
   * against — the templates in this project are that version's shape.
   *
   * WHY BOTH THIS AND `kit`. They answer different questions, and `package.json`
   * can only ever answer the first: `kit` is the constraint the project was
   * given, this is the point it started from. After one `npm update` the
   * installed version has moved and nothing in the project remembers what it was
   * scaffolded against — which is exactly the question a later `add` or
   * `upgrade` has to answer to know which migration applies.
   *
   * WHAT IT IS NOT, stated here because the name is one letter of context away
   * from implying it: this is NOT the version npm installed. Three ways they
   * separate, all ordinary:
   *
   *   · `--kit` was passed, so `kit` points somewhere else entirely — another
   *     range, a dist-tag, or a `file:` tarball. This field still truthfully
   *     reports which CLI generation emitted the files, which is the fact a
   *     migration needs; it is deliberately NOT rewritten to match the override.
   *   · The range resolved higher within its own minor (`^0.25.0` picking up a
   *     later `0.25.x`).
   *   · The user upgraded afterwards.
   *
   * Reading the truly-installed version would mean reading
   * `node_modules/@kitn.ai/ui/package.json` after the install step — cheap, but
   * only meaningful when `--no-install` was not passed, so it would be present
   * on some projects and absent on others. A field that is sometimes there is
   * worse than one that is always there and means one thing. Recorded at build
   * time, this is always present and always exact.
   */
  kitBuiltAgainst: string;
  layout: string;
  widgetStyle: string | null;
  features: string[];
  gateway: string;
  registration: string;
  /**
   * The five copied paths, plus `route`.
   *
   * `route` is DERIVED from `framework.route` rather than stored beside the
   * others on `FrameworkDef.paths`, because the build guard that grades that
   * block asserts each path names a file the template already has — true of the
   * five, false of a route by construction. The docblock on `FrameworkDef.route`
   * has the full reasoning. It is `null` for a framework create-kai cannot emit
   * a route for, and for a project on the mock gateway, which needs no route at
   * all: a v2 `add` reading this can tell "no route here" from "route lives at
   * X" without re-deriving either.
   */
  paths: FrameworkDef['paths'] & { route: string | null };
  theme: { tokens: string; default: string };
  /**
   * The sha256 of every file this scaffold WROTE, keyed by project-relative
   * path, so a later `upgrade` can tell a template change from a user edit.
   *
   * WITHOUT THIS FIELD THERE IS NO BASELINE. `kai.json` records the OPTIONS a
   * project was scaffolded with, not the bytes that came out, so a regenerated
   * file that differs from the current templates is indistinguishable from one
   * the user edited: `upgrade` would either overwrite the user's work or refuse
   * to apply a template fix it should apply. Those two cases separate only when
   * the bytes actually written are recorded, and the files most worth protecting
   * are exactly the ones worth hashing, so the map covers EVERY emitted file
   * rather than a curated few.
   *
   * OPTIONAL, AND ITS ABSENCE MEANS "THIS PROJECT PREDATES THE BASELINE". Every
   * project scaffolded before this field existed carries no `files` map at all,
   * so a reader must treat a missing map as "no baseline recorded" rather than as
   * an empty project. It is deliberately NOT a reason to bump
   * `KAI_JSON_VERSION`: the field is purely additive, and a bump would make an
   * older reader reject a newer file for no benefit it can act on.
   *
   * `kai.json` ITSELF IS NOT IN THE MAP. A file cannot hash its own content, so
   * the hash of the file that carries the hashes is circular.
   *
   * EACH HASH IS OF THE BYTES ON DISK, taken from the exact string the emitter
   * handed to `writeFile` after every patch and rewrite, NOT from the template
   * source. A patch changes what the user receives, so hashing the source would
   * record bytes the project never had and mark every patched file as edited on
   * the first `upgrade`.
   */
  files?: Record<string, string>;
}

/**
 * `files` is a parameter rather than something the caller assigns afterwards so
 * the only way to produce it is from the writes themselves (src/generate.ts),
 * and so a caller that has no writes to report simply omits it.
 */
export function buildKaiJson(
  plan: ProjectPlan,
  framework: FrameworkDef,
  files?: Record<string, string>,
): KaiJson {
  return {
    $schema: KAI_JSON_SCHEMA_URL,
    version: KAI_JSON_VERSION,
    framework: plan.frameworkId,
    kit: plan.kit,
    kitBuiltAgainst: plan.kitBuiltAgainst,
    layout: plan.layout,
    widgetStyle: plan.widgetStyle,
    features: [...plan.featureIds],
    gateway: plan.gatewayId,
    registration: framework.registration,
    paths: {
      ...framework.paths,
      // No gateway means no route was written, so reporting where one WOULD go
      // would be reporting a file that does not exist.
      route: plan.gatewayId === 'mock' ? null : (framework.route?.file ?? null),
    },
    theme: { tokens: '@kitn.ai/ui/theme.tokens.css', default: 'dark' },
    ...(files === undefined ? {} : { files }),
  };
}

export function stringifyKaiJson(json: KaiJson): string {
  return `${JSON.stringify(json, null, 2)}\n`;
}
