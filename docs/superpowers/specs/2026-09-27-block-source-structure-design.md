# Block source structure — many declared files, and a size budget with teeth

**Status:** approved in principle, queued behind the rail's hover chrome. Prompted by the owner: *"it doesn't look like you're creating multiple files. You're throwing this all together into one file… I'm wondering if you need to change the JSON file or configuration file you're using to declare a file name, or let's call it a file location, so you can break out these things individually."*

## What is already true, measured

**A block declares its files by path, and always has.** `packages/blocks/blocks/assistant/registry-item.json` carries:

```json
"files": [
  { "path": "assistant.html",               "type": "registry:page" },
  { "path": "assistant.controller.ts",      "type": "registry:file" },
  { "path": "assistant.css",                "type": "registry:file" },
  { "path": "assistant.transport.mock.ts",  "type": "registry:file" },
  { "path": "assistant.transport.route.ts", "type": "registry:file" },
  { "path": "assistant.transport.none.ts",  "type": "registry:file" }
]
```

So **the JSON does not need changing**; the assistant block already ships six files, and the three transports are the working precedent for splitting one concern into its own module.

**What is actually wrong is size, not count:**

| file | lines |
|---|---|
| `states.mjs` (driver states, dev-only) | 3633 |
| **`assistant.controller.ts`** | **2067** |
| `assistant.html` | 713 |
| `assistant.transport.mock.ts` | 557 |
| `assistant.css` | 344 |

**A 2000-line controller in a template is the defect.** A block is a starting point a consumer will extend, and the first thing their agent must do is break it up — which is exactly the reviewer's complaint, and it is correct.

## The work

1. **Prove one split end-to-end before doing the rest.** Extract a single cohesive concern from `assistant.controller.ts` into a sibling module, declare it in `files`, and show every gate still green. The generator and the compile gate are the thing to prove, not the authoring.
2. **Then split along the seams the file already has** — it is sectioned already: the rail and its sections, the composer and its tools, the menus, the guides, the empty state, the transport wiring. A thin `assistant.controller.ts` keeps the state assembly; the parts become modules **named for what they hold**.
3. **`states.mjs` is the other offender** and is dev-only. It may split, or it may be accepted as a driver script — but that choice gets made explicitly rather than by neglect.
4. **A size budget with a guard, not a wish.** No block source file over a modest limit, checked by a lint that needs no build, so the next round that appends to a controller fails a gate instead of a review. **The limit is derived, not typed**: pick it from what the existing files actually are, not from a round number.
5. **The generated forms are not in scope.** The React and HTML forms are build outputs, one file per form by construction; nobody hand-edits them, and their size is not a maintenance cost. **The scope is the block's source.**

## Acceptance

- Every file the block ships is declared in its registry item, and the emitted scaffold writes them at the declared paths.
- Every gate that touches blocks stays green across the split: the compile cells, all three blocks' driver legs, both renderers, the fence compilation, and the guide checks.
- The lint fires on a deliberately oversized file and stays quiet on the current tree.
- **The proof that it helps is the diff, not the intent**: the controller drops below the limit without any behaviour change, and the driver states and baselines do not move except where a state name moved with its module.

## Non-goals

- No change to the registry's schema: paths and types already exist.
- No splitting for its own sake: a 60-line module that exists only to make a number smaller is worse than the file it came from.
- No touching the generated forms.
