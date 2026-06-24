import type { Meta, StoryObj } from 'storybook-solidjs-vite';

// A visual explainer for the composition model (slots + data), shown as a story
// so it lives alongside the spikes in Storybook. The SVG is self-contained and
// rendered via innerHTML so it stays a single, themeable asset.

const COMPOSITION_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="1160" height="720" viewBox="0 0 1160 720" font-family="system-ui,-apple-system,'Segoe UI',Roboto,sans-serif">
  <rect width="1160" height="720" fill="#ffffff"/>
  <text x="40" y="48" font-size="26" font-weight="700" fill="#0f172a">How composition works in <tspan font-family="ui-monospace,SFMono-Regular,Menlo,monospace" fill="#be185d">&lt;kai-chat&gt;</tspan></text>
  <text x="40" y="76" font-size="15" fill="#64748b">You project your own markup into named <tspan font-weight="600" fill="#334155">slots</tspan>; per-item data stays a <tspan font-weight="600" fill="#334155">prop</tspan> we render.</text>

  <text x="40" y="128" font-size="13" font-weight="700" fill="#475569" letter-spacing="1.2">YOU WRITE — light DOM</text>
  <rect x="40" y="140" width="486" height="404" rx="12" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/>
  <g font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="14.5">
    <text x="64" y="178" fill="#0f172a">&lt;kai-chat&gt;</text>
    <circle cx="76" cy="205" r="5" fill="#2563eb"/><text x="92" y="210" fill="#334155">&lt;nav    <tspan fill="#0f172a" font-weight="600">slot="sidebar"</tspan>&gt;…&lt;/nav&gt;</text>
    <circle cx="76" cy="233" r="5" fill="#d97706"/><text x="92" y="238" fill="#334155">&lt;header <tspan fill="#0f172a" font-weight="600">slot="header"</tspan>&gt;…&lt;/header&gt;</text>
    <circle cx="76" cy="261" r="5" fill="#d97706"/><text x="92" y="266" fill="#334155">&lt;div    <tspan fill="#0f172a" font-weight="600">slot="empty"</tspan>&gt;…&lt;/div&gt;</text>
    <circle cx="76" cy="289" r="5" fill="#d97706"/><text x="92" y="294" fill="#334155">&lt;form   <tspan fill="#0f172a" font-weight="600">slot="composer"</tspan>&gt;…&lt;/form&gt;</text>
    <circle cx="76" cy="317" r="5" fill="#2563eb"/><text x="92" y="322" fill="#334155">&lt;footer <tspan fill="#0f172a" font-weight="600">slot="footer"</tspan>&gt;…&lt;/footer&gt;</text>
    <text x="64" y="350" fill="#0f172a">&lt;/kai-chat&gt;</text>
    <circle cx="76" cy="402" r="5" fill="#16a34a"/><text x="92" y="407" fill="#334155">el.<tspan fill="#0f172a" font-weight="600">messages</tspan> = [ … ]</text>
    <text x="92" y="428" fill="#94a3b8" font-size="12.5">data — a prop, not a slot</text>
  </g>
  <text x="64" y="492" font-size="13" fill="#64748b" font-family="system-ui">Your <tspan font-weight="600" fill="#334155">&lt;nav&gt;</tspan>, <tspan font-weight="600" fill="#334155">&lt;form&gt;</tspan>, your CSS —</text>
  <text x="64" y="512" font-size="13" fill="#64748b" font-family="system-ui">nothing <tspan font-family="ui-monospace,Menlo,monospace" fill="#be185d">kai-*</tspan> required inside a slot.</text>

  <text x="582" y="330" font-size="12.5" font-weight="600" fill="#64748b" font-family="system-ui">projects</text>
  <text x="588" y="348" font-size="12.5" font-weight="600" fill="#64748b" font-family="system-ui">into</text>
  <defs><marker id="kai-comp-arrow" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="#94a3b8"/></marker></defs>
  <line x1="540" y1="360" x2="628" y2="360" stroke="#94a3b8" stroke-width="2" marker-end="url(#kai-comp-arrow)"/>

  <text x="648" y="128" font-size="13" font-weight="700" fill="#475569" letter-spacing="1.2">WE RENDER — shadow DOM</text>
  <rect x="648" y="140" width="472" height="404" rx="14" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" stroke-dasharray="6 5"/>
  <text x="668" y="160" font-size="11.5" font-family="ui-monospace,Menlo,monospace" fill="#94a3b8">kai-chat · shadow root</text>

  <rect x="664" y="172" width="118" height="356" rx="9" fill="#eff6ff" stroke="#2563eb" stroke-width="1.5"/>
  <text x="723" y="338" font-size="13" font-weight="700" fill="#1d4ed8" text-anchor="middle">sidebar</text>
  <text x="723" y="357" font-size="10" font-family="ui-monospace,Menlo,monospace" fill="#3b82f6" text-anchor="middle">your &lt;nav&gt;</text>

  <rect x="794" y="172" width="312" height="50" rx="9" fill="#fffbeb" stroke="#d97706" stroke-width="1.5"/>
  <text x="810" y="196" font-size="13" font-weight="700" fill="#b45309">header</text>
  <text x="810" y="213" font-size="10.5" font-family="ui-monospace,Menlo,monospace" fill="#d97706">built-in · or your slot</text>

  <rect x="794" y="232" width="312" height="200" rx="9" fill="#f0fdf4" stroke="#16a34a" stroke-width="1.5"/>
  <text x="810" y="256" font-size="13" font-weight="700" fill="#15803d">messages → cards</text>
  <text x="810" y="274" font-size="10.5" font-family="ui-monospace,Menlo,monospace" fill="#16a34a">data · card-registry</text>
  <rect x="812" y="356" width="276" height="60" rx="8" fill="#fffbeb" stroke="#d97706" stroke-width="1.3" stroke-dasharray="4 3"/>
  <text x="950" y="382" font-size="12" font-weight="700" fill="#b45309" text-anchor="middle">empty</text>
  <text x="950" y="400" font-size="10" font-family="ui-monospace,Menlo,monospace" fill="#d97706" text-anchor="middle">your slot · shown when no messages</text>

  <rect x="794" y="442" width="312" height="24" rx="7" fill="#eff6ff" stroke="#2563eb" stroke-width="1.3"/>
  <text x="810" y="459" font-size="11" font-weight="600" fill="#1d4ed8">composer-actions <tspan font-family="ui-monospace,Menlo,monospace" font-weight="400" fill="#3b82f6">· inject</tspan></text>

  <rect x="794" y="472" width="312" height="40" rx="8" fill="#fffbeb" stroke="#d97706" stroke-width="1.5"/>
  <text x="810" y="497" font-size="12.5" font-weight="700" fill="#b45309">composer <tspan font-size="10.5" font-family="ui-monospace,Menlo,monospace" font-weight="400" fill="#d97706">· default or your slot</tspan></text>

  <rect x="794" y="518" width="312" height="22" rx="7" fill="#eff6ff" stroke="#2563eb" stroke-width="1.3"/>
  <text x="810" y="534" font-size="11" font-weight="600" fill="#1d4ed8">footer <tspan font-family="ui-monospace,Menlo,monospace" font-weight="400" fill="#3b82f6">· inject</tspan></text>

  <line x1="40" y1="590" x2="1120" y2="590" stroke="#e2e8f0" stroke-width="1.5"/>
  <g font-family="system-ui">
    <rect x="40" y="612" width="16" height="16" rx="4" fill="#eff6ff" stroke="#2563eb" stroke-width="1.5"/>
    <text x="66" y="618" font-size="13.5" font-weight="700" fill="#1d4ed8">INJECT</text>
    <text x="66" y="636" font-size="12.5" fill="#64748b">your markup is <tspan font-weight="600" fill="#334155">added</tspan> to the region (a slot)</text>
    <rect x="420" y="612" width="16" height="16" rx="4" fill="#fffbeb" stroke="#d97706" stroke-width="1.5"/>
    <text x="446" y="618" font-size="13.5" font-weight="700" fill="#b45309">REPLACE</text>
    <text x="446" y="636" font-size="12.5" fill="#64748b">your markup <tspan font-weight="600" fill="#334155">stands in</tspan>; you own its events</text>
    <rect x="800" y="612" width="16" height="16" rx="4" fill="#f0fdf4" stroke="#16a34a" stroke-width="1.5"/>
    <text x="826" y="618" font-size="13.5" font-weight="700" fill="#15803d">DATA</text>
    <text x="826" y="636" font-size="12.5" fill="#64748b">a <tspan font-weight="600" fill="#334155">prop</tspan> — we render each item; never a slot</text>
  </g>
  <text x="40" y="690" font-size="12" fill="#94a3b8">Slots can't read the component's reactive data — that boundary is why per-item content (messages, cards) stays a prop, not a slot.</text>
</svg>`;

const meta = {
  title: 'Spikes/How Composition Works',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;
export default meta;
type Story = StoryObj;

/** The composition model: slots (inject / replace) + data (a prop, via the card registry). */
export const KaiChat: Story = {
  render: () => (
    <div style={{ padding: '24px', 'max-width': '1200px', margin: '0 auto' }} innerHTML={COMPOSITION_SVG} />
  ),
};
