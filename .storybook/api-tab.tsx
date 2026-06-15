import React from 'react';
import { addons, types, useStorybookState } from 'storybook/manager-api';
import { useTheme } from 'storybook/theming';
import { SyntaxHighlighter } from 'storybook/internal/components';
import elementMeta from '../src/elements/element-meta.json';
import componentMeta from '../src/components/component-meta.json';
import frameworkUsage from '../src/elements/framework-usage.json';
import { exampleUsageByTitle, type ExampleUsage } from '../src/stories/examples/usage';

type Usage = { tag: string; displayName: string; hasSolid: boolean; snippets: Record<string, string> };
const usageByTag = new Map((frameworkUsage as Usage[]).map((u) => [u.tag, u]));

// FrameworkTabs needs only the snippet map + whether a Solid tab exists, so both
// the generated element usage and the hand-authored Example usage feed it.
type Snippets = { hasSolid: boolean; snippets: Record<string, string> };

const FRAMEWORKS: { key: string; label: string }[] = [
  { key: 'html', label: 'HTML' },
  { key: 'react', label: 'React' },
  { key: 'svelte', label: 'Svelte' },
  { key: 'vue', label: 'Vue' },
  { key: 'angular', label: 'Angular' },
  { key: 'solid', label: 'Solid' },
];
// Remembered across elements within a session, so a React dev picks "React" once.
let lastFramework = 'html';

// Prism language per framework tab (SFCs highlight fine as html; TS/JSX as jsx/tsx).
const SNIPPET_LANG: Record<string, string> = {
  html: 'html', react: 'jsx', vue: 'html', svelte: 'html', angular: 'typescript', solid: 'jsx',
};

// A dedicated "API" tab (next to "Docs") for the generated specs, so the Docs
// tab stays focused on the live examples and the (often large) generated spec
// lives on its own tab. Manager addon = React, built separately from the Solid
// stories, so there's no framework clash. Renders from the generated metas:
//   - Components/<displayName>             → element-meta.json   (properties/attributes/events)
//   - Solid (Advanced)/Elements|Primitives → component-meta.json  (props/callbacks/slots)

const ADDON_ID = 'kitn/api';
const TAB_ID = 'kitn-api-tab';
const WC_PREFIX = 'Components/';

type EventSpec = { name: string; detail: string | null; displayDetail: string | null; description: string };
type PropSpec = { name: string; type: string; displayType: string; default?: string; optional?: boolean; scalar: boolean; description: string };
type Composed = { name: string; group: string; storyId?: string };
type ElementSpec = {
  tag: string; displayName: string; props: PropSpec[]; events: EventSpec[]; composedFrom: Composed[]; tokens: string[];
};
type CallbackSpec = { name: string; type: string; displayType: string; description: string };
type SlotSpec = { name: string; description: string };
type ComponentSpec = {
  name: string; group: 'Components' | 'UI'; sourceFile: string;
  props: PropSpec[]; callbacks: CallbackSpec[]; slots: SlotSpec[];
  tokens: string[]; extendsHtmlAttributes: boolean; description: string;
};
const elements = elementMeta as unknown as ElementSpec[];
const components = componentMeta as unknown as ComponentSpec[];

const kebab = (n: string) => n.replace(/([A-Z])/g, '-$1').toLowerCase();

// Payloadless events (no detail / empty Record) show as a dash.
const detailText = (d: string | null) => (!d || d === 'Record<string, never>' ? '—' : d);
// Drop the noise `undefined` arm from an optional prop's union (optionality is
// shown by the column itself); keep `null` (meaningful, e.g. cva variants).
const dropUndefined = (t: string) => t.replace(/^undefined \| /, '').replace(/ \| undefined$/, '');
// Pretty-print object-literal types multi-line.
function formatType(t: string): string {
  if (!t.includes('{')) return t;
  let out = '', indent = 0;
  const pad = () => '\n' + '  '.repeat(Math.max(0, indent));
  for (const ch of t) {
    if (ch === '{') { indent++; out += '{' + pad(); }
    else if (ch === '}') { indent--; out += pad() + '}'; }
    else if (ch === ';') { out += ';' + pad(); }
    else out += ch;
  }
  return out.replace(/\n[ ]*\n/g, '\n').replace(/[ \t]+\n/g, '\n').trim();
}

function useStyles() {
  const theme = useTheme();
  const text = theme.color.defaultText;
  const muted = theme.textMutedColor ?? theme.color.mediumdark;
  const border = theme.appBorderColor;
  const mono = theme.typography.fonts.mono;
  const th: React.CSSProperties = { textAlign: 'left', padding: '7px 12px', borderBottom: `1px solid ${border}`, fontWeight: 700, color: text, whiteSpace: 'nowrap' };
  const td: React.CSSProperties = { padding: '7px 12px', borderBottom: `1px solid ${border}`, verticalAlign: 'top', color: muted };
  const code: React.CSSProperties = { fontFamily: mono, fontSize: 12.5, color: text };
  const mblock: React.CSSProperties = { ...code, whiteSpace: 'pre', display: 'inline-block', margin: 0 };
  const h3: React.CSSProperties = { color: text, fontSize: 15, fontWeight: 700, margin: '28px 0 10px' };
  return { theme, text, muted, border, code, mblock, h3, th, td };
}

function Wrap({ children }: { children: React.ReactNode }) {
  const { theme } = useStyles();
  // Full-height, top-aligned, scrollable wrapper — defeats the tab container's
  // flex vertical-centering (which looked odd for short specs).
  return (
    <div style={{ height: '100%', width: '100%', overflowY: 'auto', background: theme.background.content }}>{children}</div>
  );
}

function FrameworkTabs({ usage, heading = 'Usage' }: { usage?: Snippets; heading?: string | null }) {
  const { h3, border, text, muted, theme } = useStyles();
  const u = usage;
  const [fw, setFw] = React.useState(lastFramework);
  // active may differ from fw when the current element has no snippet for the
  // remembered framework (e.g. fw='solid' but this element has no Solid tab).
  const active = u && u.snippets[fw] ? fw : 'html';
  const select = (k: string) => { lastFramework = k; setFw(k); };
  // Reconcile React state to the resolved active tab so aria-selected and the
  // button highlight are never out of sync with the displayed snippet.
  // Do NOT write lastFramework here — preserving it lets an element WITH a
  // Solid snippet restore the user's remembered 'solid' choice on next render.
  React.useLayoutEffect(() => {
    if (active !== fw) setFw(active);
  }, [active, fw]);
  // All hooks are above this guard (React rules satisfied).
  if (!u) return null;
  const tabs = FRAMEWORKS.filter((f) => f.key !== 'solid' || u.hasSolid);
  // Use the theme's secondary colour (brand accent) as the selected-tab background.
  // Fall back to the default text colour so there's always contrast.
  const selectedBg = theme.color.secondary ?? text;
  const selectedFg = theme.color.inverseText ?? theme.background.content ?? '#fff';
  return (
    <>
      {heading ? <h3 style={h3}>{heading}</h3> : null}
      <div role="tablist" aria-label="Framework" style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        {tabs.map((f) => (
          <button key={f.key} role="tab" type="button" aria-selected={active === f.key}
            onClick={() => select(f.key)}
            style={{
              font: 'inherit', fontSize: 12, padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
              border: `1px solid ${border}`,
              background: active === f.key ? selectedBg : 'transparent',
              color: active === f.key ? selectedFg : muted,
            }}>
            {f.label}
          </button>
        ))}
      </div>
      <SyntaxHighlighter language={SNIPPET_LANG[active] ?? 'text'} copyable bordered padded>
        {u.snippets[active]}
      </SyntaxHighlighter>
    </>
  );
}

function ElementPanel({ el }: { el: ElementSpec }) {
  const { text, muted, border, code, mblock, h3, th, td } = useStyles();
  const Type = ({ t }: { t: string }) =>
    t.includes('{') ? <span style={mblock}>{formatType(t)}</span> : <span style={code}>{t}</span>;
  return (
    <div style={{ padding: '24px 32px 64px', maxWidth: 1040, margin: '0 auto', color: text, fontSize: 14, lineHeight: 1.5 }}>
      <div style={{ fontSize: 12, color: muted, marginBottom: 4 }}>Web component</div>
      <h2 style={{ color: text, fontSize: 22, margin: 0 }}><span style={code}>&lt;{el.tag}&gt;</span></h2>

      <FrameworkTabs usage={usageByTag.get(el.tag)} />

      <h3 style={h3}>Properties</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr><th style={th}>Property</th><th style={th}>Attribute</th><th style={th}>Type / values</th><th style={th}>Default</th></tr></thead>
        <tbody>
          {el.props.map((p) => (
            <tr key={p.name}>
              <td style={td}><span style={code}>{p.name}</span></td>
              <td style={td}>{p.scalar ? <span style={code}>{kebab(p.name)}</span> : <span style={{ opacity: 0.55 }}>— (property only)</span>}</td>
              <td style={td}><Type t={p.displayType} /></td>
              <td style={td}>{p.default ? <span style={code}>{p.default}</span> : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {el.events.length > 0 && (
        <>
          <h3 style={h3}>Events</h3>
          <div style={{ color: muted, fontSize: 12.5, marginBottom: 8 }}>Non-bubbling <span style={code}>CustomEvent</span>s on the element; the payload is on <span style={code}>event.detail</span>.</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={th}>Event</th><th style={th}>detail</th><th style={th}>Description</th></tr></thead>
            <tbody>
              {el.events.map((ev) => (
                <tr key={ev.name}>
                  <td style={td}><span style={code}>{ev.name}</span></td>
                  <td style={td}><Type t={detailText(ev.displayDetail)} /></td>
                  <td style={td}>{ev.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {el.composedFrom.length > 0 && (
        <>
          <h3 style={h3}>Composed from</h3>
          <div style={{ color: muted, fontSize: 12.5, marginBottom: 8 }}>This element wraps these SolidJS components:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {el.composedFrom.map((c) => (
              <a key={c.name} href={`./?path=/docs/${c.storyId}`}
                 style={{ ...code, textDecoration: 'none', padding: '3px 8px', borderRadius: 6, border: `1px solid ${border}`, color: muted }}>
                {c.group}/{c.name}
              </a>
            ))}
          </div>
        </>
      )}

      <h3 style={h3}>Theming</h3>
      <div style={{ color: muted, fontSize: 12.5 }}>
        Themed by the global design tokens — override any <span style={code}>--color-*</span> token to rebrand.
        {el.tokens.length > 0 && <> This element also reads: {el.tokens.map((t, i) => <span key={t}><span style={code}>{t}</span>{i < el.tokens.length - 1 ? ', ' : ''}</span>)}.</>}
      </div>
    </div>
  );
}

function ComponentPanel({ comp }: { comp: ComponentSpec }) {
  const { text, muted, code, mblock, h3, th, td } = useStyles();
  const Type = ({ t }: { t: string }) =>
    t.includes('{') ? <span style={mblock}>{formatType(t)}</span> : <span style={code}>{t}</span>;
  const groupLabel = comp.group === 'UI' ? 'UI primitive' : 'SolidJS component';
  const hasProps = comp.props.length > 0;
  return (
    <div style={{ padding: '24px 32px 64px', maxWidth: 1040, margin: '0 auto', color: text, fontSize: 14, lineHeight: 1.5 }}>
      <div style={{ fontSize: 12, color: muted, marginBottom: 4 }}>{groupLabel}</div>
      <h2 style={{ color: text, fontSize: 22, margin: 0 }}><span style={code}>{comp.name}</span></h2>
      {comp.description && <div style={{ color: muted, fontSize: 13, marginTop: 8 }}>{comp.description}</div>}

      <h3 style={h3}>Props</h3>
      {hasProps ? (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={th}>Prop</th><th style={th}>Type / values</th><th style={th}>Default</th></tr></thead>
          <tbody>
            {comp.props.map((p) => (
              <tr key={p.name}>
                <td style={td}><span style={code}>{p.name}</span>{!p.optional && <span style={{ color: muted, fontSize: 11 }}> *</span>}</td>
                <td style={td}><Type t={p.optional ? dropUndefined(p.displayType) : p.displayType} /></td>
                <td style={td}>{p.default ? <span style={code}>{p.default}</span> : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div style={{ color: muted, fontSize: 12.5 }}>No documented props of its own.</div>
      )}
      {hasProps && <div style={{ color: muted, fontSize: 11.5, marginTop: 6 }}><span style={{ color: muted }}>*</span> required</div>}

      {comp.callbacks.length > 0 && (
        <>
          <h3 style={h3}>Callback props</h3>
          <div style={{ color: muted, fontSize: 12.5, marginBottom: 8 }}>Function props the component calls — its outputs/events.</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={th}>Prop</th><th style={th}>Signature</th><th style={th}>Description</th></tr></thead>
            <tbody>
              {comp.callbacks.map((c) => (
                <tr key={c.name}>
                  <td style={td}><span style={code}>{c.name}</span></td>
                  <td style={td}><Type t={dropUndefined(c.displayType)} /></td>
                  <td style={td}>{c.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {comp.slots.length > 0 && (
        <>
          <h3 style={h3}>Slots</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={th}>Slot</th><th style={th}>Description</th></tr></thead>
            <tbody>
              {comp.slots.map((s) => (
                <tr key={s.name}>
                  <td style={td}><span style={code}>{s.name}</span></td>
                  <td style={td}>{s.description || 'Child content rendered inside the component.'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <h3 style={h3}>Theming</h3>
      <div style={{ color: muted, fontSize: 12.5 }}>
        Themed by the global design tokens — override any <span style={code}>--color-*</span> token to rebrand. Pass <span style={code}>class</span> for one-off styling.
        {comp.extendsHtmlAttributes && <> Also forwards standard HTML attributes to its root element.</>}
        {comp.tokens.length > 0 && <> This component also reads: {comp.tokens.map((t, i) => <span key={t}><span style={code}>{t}</span>{i < comp.tokens.length - 1 ? ', ' : ''}</span>)}.</>}
      </div>
    </div>
  );
}

// Render `intro` prose with `inline code` spans (the only markdown we use here).
function InlineCode({ text: t }: { text: string }) {
  const { code } = useStyles();
  return <>{t.split(/`([^`]+)`/g).map((p, i) => (i % 2 ? <code key={i} style={code}>{p}</code> : p))}</>;
}

// Examples/Patterns are granular SolidJS compositions; this teaches "how to
// build the thing shown" — the Solid tab mirrors the story, the other tabs are
// the hand-authored web-component equivalent.
// Examples are SolidJS compositions; the Usage tab teaches how you do the same
// thing — props + events — in each framework (representative, not a copy of the
// demo). Content is per-story: eyebrow = example name, title = the story you're
// on; an example-level fallback covers stories without their own entry.
function ExamplePanel({ usage, storyName }: { usage: ExampleUsage; storyName?: string }) {
  const { text, muted } = useStyles();
  const exampleName = usage.title.split('/').pop() ?? usage.title;
  const content = (storyName && usage.stories?.[storyName]) || usage;
  const snippets = content.snippets as Record<string, string>;
  return (
    <div style={{ padding: '24px 32px 64px', maxWidth: 1040, margin: '0 auto', color: text, fontSize: 14, lineHeight: 1.5 }}>
      <div style={{ fontSize: 12, color: muted, marginBottom: 4 }}>{exampleName}</div>
      <h2 style={{ color: text, fontSize: 22, margin: 0 }}>{storyName ?? exampleName}</h2>
      <p style={{ color: muted, margin: '8px 0 0' }}><InlineCode text={content.intro} /></p>
      <FrameworkTabs usage={{ hasSolid: !!snippets.solid, snippets }} heading={null} />
    </div>
  );
}

function ApiPanel() {
  // useStorybookState re-renders on navigation and reliably carries the index
  // entry (with its `title`); getCurrentStoryData() can be empty at tab-render.
  const { storyId, index } = useStorybookState();
  const entry = index?.[storyId] as { title?: string; name?: string } | undefined;
  const title = entry?.title;

  const example = title ? exampleUsageByTitle.get(title) : undefined;
  if (example) return <Wrap><ExamplePanel usage={example} storyName={entry?.name} /></Wrap>;

  if (title && title.startsWith(WC_PREFIX)) {
    const el = elements.find((e) => e.displayName === title.slice(WC_PREFIX.length));
    if (el) return <Wrap><ElementPanel el={el} /></Wrap>;
  } else if (title) {
    // Component name is always the last path segment — decoupled from the
    // group-label tier (e.g. "Solid (Advanced)/Primitives/Button" → "Button").
    const segs = title.split('/');
    const name = segs[segs.length - 1];
    const comp = components.find((c) => c.name === name);
    if (comp) return <Wrap><ComponentPanel comp={comp} /></Wrap>;
    // Compound family (e.g. ".../Resizable") — render every member.
    const family = components.filter((c) => c.name.startsWith(name));
    if (family.length > 0) return <Wrap>{family.map((c) => <ComponentPanel key={c.name} comp={c} />)}</Wrap>;
  }
  return <Wrap><div style={{ padding: 32, opacity: 0.6 }}>No API spec for this item.</div></Wrap>;
}

addons.register(ADDON_ID, () => {
  addons.add(TAB_ID, {
    type: types.TAB,
    title: 'Usage',
    // NOTE: Storybook 10 TAB addons no longer honour a `match`/`route` predicate
    // (see MIGRATION.md: "Tab addons cannot manually route") — a TAB is added to
    // EVERY entry. Per-entry visibility is therefore handled in `manager.ts`,
    // which toggles `previewTabs['kitn-api-tab'].hidden` so this tab only shows
    // on the component tiers (components-* / solid-advanced-elements|primitives-*)
    // and stays off the documentation pages.
    render: ({ active }) => (active ? <ApiPanel /> : null),
  });
});
