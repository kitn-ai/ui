# E — Agent card to a pattern, artifact toolbar to slots, ViewStack documented (2026-09-29)

Part of the [composition round](2026-09-29-composition-round-design.md); builds on
[A](2026-09-29-A-composition-contract-design.md). Owner decisions 6, 7, 9 (break now).

> Decision 6: "the dev or AI agent constructing with our components would create a native wrapper
> component like Agent Card and construct it using these different parts. We would just provide
> patterns to show a way of doing this"
>
> Decision 7: "exceptions are things like Artifact where it is complex and providing a "mini" app-like
> solution is okay… possibly we should be using slots instead of configuration"

The card removals (confirm/choice/form/tasks) are in [C](2026-09-29-C-questions-design.md) §6,
because the question panel replaces them.

## 1. `kai-agent-card` → the `agent-card` pattern

**Today.** `kai-agent-card` (`web-components/agent-card/agent-card.tsx`, Solid
`components/agent-card/agent-card.tsx`) has props `name`, `active`, `needsAttention`, `status`
(`working | idle | done | error | blocked`), no slots, parts `status` and `menu`, events
`kai-activate` and `kai-menu`. You get exactly that row.

**Change.** Delete the element and the Solid component. Replace them with a pattern built from
public parts, which is what the owner described:

```html
<kai-row interactive class="agent" data-status="working">
  <kai-status slot="leading" status="working" pulse label="Working"></kai-status>
  Research agent
  <kai-badge slot="trailing" variant="outline">Needs you</kai-badge>
  <kai-menu slot="trailing" trigger-icon="ellipsis" label="Agent actions"></kai-menu>
</kai-row>
```

The pattern (`packages/blocks/patterns/agent-card/`, story `Patterns/Agent Card`, docs
`/patterns/agent-card`, `kai add agent-card`) shows the five statuses, the attention badge, the
active state (`aria-current` on the row) and the menu; the app owns activation (`kai-click` on the
row) and the menu items.

Two kit additions the pattern needs, both measured absent today:

- **`kai-status` agent tones.** `StatusKind` is `new | online | busy | away | offline`
  (`components/status/status.tsx:4`), a presence vocabulary. The agent card's five statuses
  (`working | idle | done | error | blocked`, `AgentStatusTone`, identical to `PaneStatusTone` at
  `components/pane/pane.tsx:7`) are added to `StatusKind`, reusing the hues `AgentCard` uses today, so the
  pattern does not re-invent a status dot.
- **`kai-badge` `outline` variant.** `variant` is `default | count | citation`
  (`web-components/badge/badge.tsx:6`). `outline` is added with its story (this was the parked
  block round's open question 1, answered yes there).

**Fallout (scoped grep, 20 files; the implementer re-runs it):**
`src/solid.ts` export; `web-components/agent-card/`; `components/agent-card/` (component + story);
`web-components/slots/slots.ts` (`AGENT_CARD_PARTS`, the registry entry at line 1000) and
`slots.test.ts`; `wire/payload-boundary.test.ts` (uses the element as a probe at line 459: switch
to another element with an object prop); the three `web-component/*` registry/diagnostics tests;
`stories/showcase/split-workspace.stories.tsx` (migrate to the pattern markup);
`components/pane/pane-group.tsx` and `components/icon/icon.tsx` (comments only);
`scripts/lint-story-conventions.mjs`; regenerated: meta, types, manifest, nonscalar, React
wrappers (`frameworks/react/index.tsx`), `mcp/catalog/derived.json`, `llms-full.txt`,
`docs/web-components.md`; the docs component page removed with a redirect to
`/patterns/agent-card`.

## 2. `kai-artifact`: the toolbar becomes slots

**Today.** `kai-artifact` has 19 props, five of which only hide toolbar pieces: `noNav`,
`noReload`, `noHome`, `noPathField`, `noTabs` (`web-components/artifact/artifact.tsx:28-36`, mapped
to the Solid `showNav`/`showReload`/`showHome`/`showPathField`/`showTabs` at lines 173-177 and
`components/artifact/artifact.tsx:98-106`). It already exposes the methods a toolbar needs:
`back`, `forward`, `reload`, `home`, `navigate`, `selectFile`, `openExternal`, `maximize`,
`restore`, and events `kai-navigate {url}`, `kai-tab-change {tab}`, `kai-file-select {path}`,
`kai-maximize-change`.

**Keep sealed:** the sandboxed iframe, the file tree/code view, the URL policy
(`artifact-url-xss.test.tsx`), and the card envelope's narrow slice (`guides/generative-ui.mdx:54`).

**Change.**

1. Delete the five `no*` props (web component) and the five `show*` props (Solid).
2. Add slots:
   - `toolbar`: when filled, **replaces** the built-in toolbar entirely (an empty element in it
     means "no toolbar");
   - `toolbar-start`, `toolbar-end`: add controls to the built-in toolbar's ends.
   Detection by `readSlots`, like every other slotted region. Solid: `toolbar`, `toolbarStart`,
   `toolbarEnd` JSX props.
3. Expose the state a composed toolbar needs, read-only: `url`, `canGoBack`, `canGoForward`, as
   host getters, and one event `kai-history-change {url, canGoBack, canGoForward}` fired on every
   navigation, so a custom back button can disable itself. `tab` is already a prop, so a composed
   Preview/Code switch sets `el.tab` and listens to `kai-tab-change`.
4. `expandable` and `openInTab` stay: they ADD opt-in buttons rather than hiding defaults. They are
   the same smell in a milder form, and the report raises them.
5. A pattern, `artifact-toolbar` (`/patterns/artifact-toolbar`, `kai add artifact-toolbar`): a
   minimal toolbar of a path field and an open-in-tab button, and a code-only viewer with no
   toolbar, both composed from `kai-button`/`kai-input` calling the element's methods.

**Fallout (scoped grep, 15 files):** `web-components/artifact/artifact.tsx`,
`components/artifact/artifact.tsx`; `tests/web-components/artifact.test.tsx`,
`tests/web-components/chat-home.test.tsx`, `tests/stories/web-component-controls.test.ts`;
`stories/showcase/v0.stories.tsx` (lines 575, 632) and `split-workspace.stories.tsx` (1886, 2160)
migrate to the slots; `examples/apps/builder/src/components/PreviewPanel.tsx:122`;
`apps/docs/src/content/docs/components/artifact.mdx`, `apps/docs/src/components/Playground.tsx`;
`mcp/construct/cli.test.ts`, `mcp/catalog/derived.json`; regenerated meta/types/React wrappers.

## 3. ViewStack: documented as navigation, nothing removed

**Today.** `ViewStack`/`View` (`components/view/view-stack.tsx`, `kai-view-stack`/`kai-view`) is
the mobile drill-in navigator inside `kai-chat` (home → thread, back; `createViewStack` used at
`components/chat/chat-thread.tsx:31,347`, `chat-app.tsx` after A0). It does not overlap the thread.
The owner asked whether it is outdated; it is not.

**Change.** Its docs page and Storybook title move under navigation (`Components/Navigation/View
Stack`), the page opens with "the drill-in navigator `kai-chat` uses; not a chat thread", and the
`kai-chat` page links to it. No API change.

## 4. Testing

- Agent card: the pattern story passes axe in light/dark; keyboard activation (Enter/Space on the
  row) and the menu trigger work; `kai add agent-card` renders in a scratch app. A scoped grep for
  `kai-agent-card|AgentCard` returns only history.
- Artifact: red first, a test that a `slot="toolbar"` child replaces the built-in toolbar fails
  before the slot exists; then: `toolbar-start`/`-end` placement, an empty `toolbar` slot removes
  the toolbar, `canGoBack`/`canGoForward` update and `kai-history-change` fires across
  `navigate`/`back`/`forward`; the URL XSS tests unchanged and green; the two showcase stories
  render as before (screenshot compare against the pre-change capture).
- Gates: typecheck, unit, storybook project, `verify:generated`, `verify:consumer`,
  `verify:scaffold`, `lint:preset-parts`, `lint:story-conventions`.

## 5. Acceptance

1. `kai-agent-card` is gone; the `agent-card` pattern reproduces it from public parts.
2. `kai-artifact` has no `no*` props; its toolbar is replaceable and extendable by slots, and a
   composed toolbar can read history state.
3. ViewStack's docs say what it is.

## 6. Risks

- Consumers using `no*` props or `kai-agent-card` break on upgrade (decision 9, accepted); the
  release notes give the slot and pattern replacements side by side.
