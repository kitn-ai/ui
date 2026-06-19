Fixes

- Theming Section needs to be moved up to the top Under Docs, its down at the bottom 

- I want to custom style the scrollbars in our components so they have the same look and feel when not using Mac (The default Windows/Linux scrollbar) just looks odd and out of place with our components. Support light/dark mode

- Do we need to update readme with now to run examples? and provide a documentation expert on them?

- Examples. Break them out a little better, CSS from the code? for example in the React example and also better organize the data that is being applied. Make it a better experience for a developer who is looking at the code example and understanding what is going on.

- Angular example

- Vue example

Overall improvements to the examples we have

=================================

kitn-ai.github.io/chat
kitn.dev

[X]A2UI / AG-UI Was thinking of using an Iframe approach, CSP concens, pros / cons 
[X]- A means to communicate
[X]- SDK needed for this? If so, new SDK / Different? 

Website - Storybook | Examples | Editor | Other?

[X] Vitest - Unit tests? Storybook Integration

[ ] Voice Output / Speak
[X] Code Examples not really displaying properly
[X] kc-> rename to just regular names, so instead of kc-artifact, the story name should just be Artifact and the doc should have the title
Artifact
kc-artifact
[X] API should only display on docs/stories where it makes sense
[X] Overview Doc in the Components section for Solid JS
[X] Overview UI in the Components section for Solid JS - Are these be considered primitives? Should we call those Primitives or Elements? 

Extended capabilities
- Integrations -> Wordpress | Stores like Shopify, WooCommerce etc? | Salesforce | Other Integrations that make sense?

[ ] Examples besides using OpenRouter, such as 
  - Vecel AI Gateway, 
  - Integrtating with Vercel AI SDK, 
  - LangGraph/Langchain, not sure what the right on is there? 
  - Cloudflare

[ ] *** The storybook where we are showing SolidJS, would those work for React too since we have wrappers for React? if So maybe we rebrand those items? ***

[ ] Good call — a cross-origin postMessage transport is exactly where independent eyes catch gaps before code. I'll convene a 4-lens review panel (security, protocol/correctness, architecture/integration,
  testability/feasibility), each reviewing independently against the spec + the real code, each returning concrete gaps + a confidence score. Then I'll synthesize the consensus and an overall confidence level.


[X] --kitn tokens should be renamed to --kc to match the web components

[X] 508 compliancy - we have something we are using to test that with -> axe-core

[X] kc-artifact -> expand/collapse -> expands the entire view (its not a browser full-screen)


Things to fix/update
- Resizable - Double-click to reset to original position
- Web components - The controls don't look like they are updating the web components
- React Wrapper - Instead of KcArtifact, just call it Artifact like SolidJS -> possible? The dev could then choose to rename it or handle it in different ways TypeScript.

==================

[ ] Island Architecture -> possible?


==================

1. Review the 5 fan-out specs    ┌──────────────────────────────────────────┐
                                  │ → consolidated spec review               │
 2. Implement the Card            │ → the handful of decisions for you       │
   Contract foundation            │ → then implement the contract            │
 3. Spec the kc-artifact          └──────────────────────────────────────────┘
   features


YEs you can write it up. Question, can you think of any additional AG patterns that woudl be useful
  for default cards or related that we do not cover?

⏺ Great question — let me answer it, then write the spec (and I'll fold the worthwhile ideas into a
  "future / not covered" section so they're recorded).

  Patterns we don't cover that are genuinely common in agentic UIs:

================

Data shapes to help the conversation messages
progress / markdown / links / resources 

================

[X] Reveiw events like on thumbs up / on thumbs down instead of single response with a value

================


  New card types (highest-value gaps):
  - kc-choice / options-select — "pick one of N" rich options (flights, plans, restaurants, products).
  Distinct from kc-form (free-form input), kc-confirm (fixed buttons), and kc-task-list (multi-select
  checklist). This is probably the biggest gap — it's the single most common generative-UI interaction
  after forms.
  - kc-table / data grid — tabular results (DB queries, comparisons). Display + optional per-row action.
  - kc-status / progress — a live, long-running agent task ("Deploying… step 3/5"). This one's
  interesting because it leans on the existing state verb (the agent patches the card as work
  progresses) — so it validates the contract design.
  - kc-detail / fields — a key-value "record" view ("here's the entity I found"): label→value pairs, the
  read-only counterpart to kc-form.

  Heavier / better as remote (iframe) cards later: kc-chart (needs a viz lib), kc-scheduler (date/slot
  picker), map/location, and anything payment/checkout (sensitive → the contract's authToken remote
  path).

  Two pattern-level (not card-type) gaps worth naming:
  - Streaming / in-place updates — the agent updates a card's data for the same envelope id over time.
  Our dispatcher keys by id and CardRenderer is reactive, so this already works — but it's worth
  documenting as a first-class pattern in the Overview.
  - Card replacement / follow-up — after a confirm, the agent swaps in a result card by updating the
  cards array.

  The key payoff for this design: none of these require the dispatcher to change. The types override
  seam means every new card type is purely additive — register a kc-* element, add one type→tag entry.
  And checking them against the contract's verbs (action/submit-data/state/open/dismiss) — they all fit;
  no new verbs needed. That's good evidence the foundation is right.

  I'd keep all of these out of scope now (we're shipping the dispatcher + Overview) but capture them as
  a backlog in the spec. Writing it up now:
