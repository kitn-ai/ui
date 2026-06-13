import React from 'react';
import { addons, types, useStorybookApi } from 'storybook/manager-api';
import { useTheme } from 'storybook/theming';
import meta from '../src/elements/element-meta.json';

// A dedicated "API" tab (next to "Docs") for the Web Components, so the Docs tab
// stays focused on the live examples and the (often large) generated spec lives
// on its own tab. Manager addon = React, built separately from the Solid stories,
// so there's no framework clash. Renders from the generated element-meta.json.

const ADDON_ID = 'kitn/api';
const TAB_ID = `${ADDON_ID}/tab`;
const PREFIX = 'Web Components/';

type EventSpec = { name: string; detail: string | null; displayDetail: string | null; description: string };
type PropSpec = { name: string; type: string; displayType: string; default?: string; scalar: boolean; description: string };
type Composed = { name: string; group: string; storyId?: string };
type ElementSpec = {
  tag: string; props: PropSpec[]; events: EventSpec[]; composedFrom: Composed[]; tokens: string[];
};
const elements = meta as unknown as ElementSpec[];

const kebab = (n: string) => n.replace(/([A-Z])/g, '-$1').toLowerCase();
const tagFromTitle = (title?: string) => (title && title.startsWith(PREFIX) ? title.slice(PREFIX.length) : null);
// Payloadless events (no detail / empty Record) show as a dash.
const detailText = (d: string | null) => (!d || d === 'Record<string, never>' ? '—' : d);
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

function ApiPanel() {
  const api = useStorybookApi();
  const theme = useTheme();
  const data = api.getCurrentStoryData() as { title?: string } | undefined;
  const tag = tagFromTitle(data?.title);
  const el = elements.find((e) => e.tag === tag);

  const text = theme.color.defaultText;
  const muted = theme.textMutedColor ?? theme.color.mediumdark;
  const border = theme.appBorderColor;
  const mono = theme.typography.fonts.mono;

  // Full-height, top-aligned, scrollable wrapper — defeats the tab container's
  // flex vertical-centering (which looked odd for short specs).
  const wrap = (children: React.ReactNode): React.ReactElement => (
    <div style={{ height: '100%', width: '100%', overflowY: 'auto', background: theme.background.content }}>{children}</div>
  );

  if (!el) return wrap(<div style={{ padding: 32, color: muted }}>No API spec for this item.</div>);

  const th: React.CSSProperties = { textAlign: 'left', padding: '7px 12px', borderBottom: `1px solid ${border}`, fontWeight: 700, color: text, whiteSpace: 'nowrap' };
  const td: React.CSSProperties = { padding: '7px 12px', borderBottom: `1px solid ${border}`, verticalAlign: 'top', color: muted };
  const code: React.CSSProperties = { fontFamily: mono, fontSize: 12.5, color: text };
  const mblock: React.CSSProperties = { ...code, whiteSpace: 'pre', display: 'inline-block', margin: 0 };
  const h3: React.CSSProperties = { color: text, fontSize: 15, fontWeight: 700, margin: '28px 0 10px' };

  const Type = ({ t }: { t: string }) =>
    t.includes('{') ? <span style={mblock}>{formatType(t)}</span> : <span style={code}>{t}</span>;

  return wrap(
    <div style={{ padding: '24px 32px 64px', maxWidth: 1040, margin: '0 auto', color: text, fontSize: 14, lineHeight: 1.5 }}>
      <div style={{ fontSize: 12, color: muted, marginBottom: 4 }}>Web component</div>
      <h2 style={{ color: text, fontSize: 22, margin: 0 }}><span style={code}>&lt;{el.tag}&gt;</span></h2>

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

addons.register(ADDON_ID, () => {
  addons.add(TAB_ID, {
    type: types.TAB,
    title: 'API',
    // Only for the Web Components group (story ids start with `web-components-`).
    match: ({ storyId }) => !!storyId && storyId.startsWith('web-components-'),
    render: ({ active }) => (active ? <ApiPanel /> : null),
  });
});
