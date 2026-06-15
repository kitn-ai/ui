import React from 'react';
import { addons, types, useStorybookApi } from 'storybook/manager-api';
import { useTheme } from 'storybook/theming';
import elementMeta from '../src/elements/element-meta.json';
import componentMeta from '../src/components/component-meta.json';
import frameworkUsage from '../src/elements/framework-usage.json';

type Usage = { tag: string; displayName: string; hasSolid: boolean; snippets: Record<string, string> };
const usageByTag = new Map((frameworkUsage as Usage[]).map((u) => [u.tag, u]));

const FRAMEWORKS: { key: string; label: string }[] = [
  { key: 'html', label: 'HTML' },
  { key: 'react', label: 'React' },
  { key: 'vue', label: 'Vue' },
  { key: 'angular', label: 'Angular' },
  { key: 'solid', label: 'Solid' },
];
// Remembered across elements within a session, so a React dev picks "React" once.
let lastFramework = 'html';

// A dedicated "API" tab (next to "Docs") for the generated specs, so the Docs
// tab stays focused on the live examples and the (often large) generated spec
// lives on its own tab. Manager addon = React, built separately from the Solid
// stories, so there's no framework clash. Renders from the generated metas:
//   - Web Components/<tag>     → element-meta.json   (properties/attributes/events)
//   - Components|UI/<Name>     → component-meta.json  (props/callbacks/slots)

const ADDON_ID = 'kitn/api';
const TAB_ID = `${ADDON_ID}/tab`;
const WC_PREFIX = 'Web Components/';

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
// Matches Storybook's toId for our title segments (lowercase, strip non-alphanumerics).
const storyKey = (group: string, name: string) => `${group.toLowerCase()}-${name.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
// Set of valid "group-name" story-id prefixes that DO have a component spec, so
// the API tab only appears where there's something to show.
const componentPrefixes = components.map((c) => storyKey(c.group, c.name));
const matchesComponentStory = (id: string) =>
  componentPrefixes.some((p) => id === p || id.startsWith(`${p}-`));

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

function FrameworkTabs({ tag }: { tag: string }) {
  const { h3, mblock, border, text, muted, theme } = useStyles();
  const u = usageByTag.get(tag);
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
      <h3 style={h3}>Usage</h3>
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
      <pre style={{ ...mblock, display: 'block', overflowX: 'auto' }}>{u.snippets[active]}</pre>
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

      <FrameworkTabs tag={el.tag} />

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

function ApiPanel() {
  const api = useStorybookApi();
  const data = api.getCurrentStoryData() as { title?: string } | undefined;
  const title = data?.title;

  if (title && title.startsWith(WC_PREFIX)) {
    const el = elements.find((e) => e.displayName === title.slice(WC_PREFIX.length));
    if (el) return <Wrap><ElementPanel el={el} /></Wrap>;
  } else if (title) {
    // "Components/<Name>" or "UI/<Name>" (possibly with deeper nesting — the
    // component name is the second segment).
    const [group, name] = title.split('/');
    const comp = components.find((c) => c.group === group && c.name === name);
    if (comp) return <Wrap><ComponentPanel comp={comp} /></Wrap>;
    // Compound family stories (e.g. "UI/Resizable") have no single export named
    // after the title — render every member of the family instead.
    const family = components.filter((c) => c.group === group && c.name.startsWith(name));
    if (family.length > 0) return <Wrap>{family.map((c) => <ComponentPanel key={c.name} comp={c} />)}</Wrap>;
  }
  return <Wrap><div style={{ padding: 32, opacity: 0.6 }}>No API spec for this item.</div></Wrap>;
}

addons.register(ADDON_ID, () => {
  addons.add(TAB_ID, {
    type: types.TAB,
    title: 'API',
    // Web Components (story ids `web-components-*`) + the SolidJS/UI components
    // that have a generated spec.
    match: ({ storyId }) =>
      !!storyId && (storyId.startsWith('web-components-') || matchesComponentStory(storyId)),
    render: ({ active }) => (active ? <ApiPanel /> : null),
  });
});
