// The ONE statement of which web-component-meta.json keys the derived catalog is
// built from, shared by `gen-catalog.mjs` -- which hard-fails when a key carries
// data on no element -- and `tests/scripts/catalog-derived.test.ts`, whose shape
// guard asserts the same thing before re-deriving from the file.
//
// WHY SHARED, when the test beside it deliberately re-derives `partVariants` by
// a DIFFERENT method from the generator's: those are different situations.
// `readVariants` is a DERIVATION, and running the generator's copy of it inside
// the test would only prove the generator does not post-process its own result.
// This is a REQUIREMENT LIST. The fault it exists to catch is a key renamed or
// dropped in `gen-web-component-api.mjs`'s printer, and two copies of the list meant
// one could be updated while the other went on checking a key nobody reads --
// or, worse, stopped checking one everybody does.
//
// WHAT SHARING COSTS, AND WHAT PAYS FOR IT
// ----------------------------------------
// With one list, deleting a key from it switches the check off on BOTH sides at
// once -- the degrade-together shape that made the original defect invisible
// (the generator and the test both fell back to `?? []`, so renaming
// `events`->`eventz` left the suite green with that field empty on every
// web component). So the list is not left unattended: catalog-derived.test.ts pins it
// against the keys of `DerivedWebComponent`'s zod shape in
// mcp/catalog/catalog-types.ts, an independently authored
// statement of the same keys. Drop one here and that test goes red naming it.
//
// The PREDICATE is deliberately NOT shared. Each side spells out "at least one
// web component carries a non-empty value under this key" itself, so the two are
// redundant detectors of the same fault rather than one point of failure; a
// predicate broken on either side still leaves the other firing on a real loss.
// They are the same rule, which is the requirement, not the same code.
//
// SHARING COSTS ONE THING MORE NOW THAT THE LIST IS NOT ALL ARRAYS. The floor both
// consumers spell out reads "at least one web component carries a NON-EMPTY value under
// this key". `description` is a single string, so the array test (`Array.isArray(e[key])
// && e[key].length > 0`) is unsatisfiable for it, and the tempting repair (drop the
// length test for the whole list) would let `description: ''` on all 100 elements pass
// as "present", which is precisely the silent-empty the floor exists to refuse. So the
// list gains a companion: which keys hold a string rather than an array. It is a
// CLASSIFICATION, not the predicate: each side still spells out its own test (see the
// module note above on why the predicate is deliberately not shared).
export const WEB_COMPONENT_META_STRING_KEYS = ['description'];

export const WEB_COMPONENT_META_KEYS = ['description', 'props', 'events', 'methods', 'parts', 'composedFrom', 'tokens'];
