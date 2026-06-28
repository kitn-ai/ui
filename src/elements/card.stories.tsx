import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { Sparkles } from 'lucide-solid';
import './register';
import mediaImg from './card-media.jpg';
import videoPoster from './video-poster.jpg';

// The presentational kai-card, modeled on the WebAwesome card: ONE element,
// flexibility from a few structural slots (media / header + header-actions /
// footer + footer-actions; body is the default slot), appearance + orientation
// variants, themeable ::parts, and a single --kai-card-spacing knob. Title and
// description are body or slot="header" content you mark up, not slots.
//
// Each story carries a hand-written HTML `code` snippet (docs.source) so the
// Storybook "Show code" panel shows real consumer markup, not generated JSX.

const meta = { title: 'Labs/Card', parameters: { layout: 'padded' } } satisfies Meta;
export default meta;
type Story = StoryObj;

const src = (code: string) => ({ docs: { source: { language: 'html', code } } });

// Placeholder media: a local sample image + a sample mp4. The image doubles as
// the video poster (shown before playback starts).
const IMG = mediaImg;
const VIDEO = 'https://lorem.video/720p';

/** The four appearance variants. */
export const Appearances: Story = {
  render: () => (
    <div class="grid max-w-4xl grid-cols-2 gap-4">
      <kai-card appearance="outlined">
        <strong class="block font-semibold">Outlined</strong>
        <p class="mt-1 text-sm text-muted-foreground">The default. A bordered card with a soft elevation.</p>
      </kai-card>
      <kai-card appearance="filled">
        <strong class="block font-semibold">Filled</strong>
        <p class="mt-1 text-sm text-muted-foreground">A raised opaque surface, no border.</p>
      </kai-card>
      <kai-card appearance="plain">
        <strong class="block font-semibold">Plain</strong>
        <p class="mt-1 text-sm text-muted-foreground">No border or background. A padded region.</p>
      </kai-card>
      <kai-card appearance="accent">
        <strong class="block font-semibold">Accent</strong>
        <p class="mt-1 text-sm opacity-90">The bold primary fill, for announcements.</p>
      </kai-card>
    </div>
  ),
  parameters: src(`<kai-card appearance="outlined">…</kai-card>
<kai-card appearance="filled">…</kai-card>
<kai-card appearance="plain">…</kai-card>
<kai-card appearance="accent">…</kai-card>`),
};

/** Full-bleed media at the top, body text below — a real image and a real video. */
export const Media: Story = {
  render: () => (
    <div class="grid max-w-2xl grid-cols-2 gap-4">
      <kai-card>
        <img slot="media" src={IMG} alt="Sample" class="block h-44 w-full object-cover" />
        This card has an image.
      </kai-card>
      <kai-card>
        <video slot="media" src={VIDEO} poster={videoPoster} muted controls class="block h-44 w-full object-cover" />
        This card has a video, with a poster shown before playback.
      </kai-card>
    </div>
  ),
  parameters: src(`<kai-card>
  <img slot="media" src="/media.jpg" alt="Sample" />
  This card has an image.
</kai-card>

<kai-card>
  <!-- poster shows before the video plays -->
  <video slot="media" src="/clip.mp4" poster="/video-poster.jpg" muted controls></video>
  This card has a video.
</kai-card>`),
};

/** Header (with an end action) + body + a footer actions cluster. */
export const HeaderFooter: Story = {
  render: () => (
    <kai-card class="max-w-sm">
      <h3 slot="header" class="font-semibold">Weekly report</h3>
      <kai-button slot="header-actions" variant="ghost" size="icon-sm" icon="sliders-horizontal" label="Settings"></kai-button>
      Generated just now from your last seven days of activity.
      <kai-button slot="footer-actions" variant="subtle">Dismiss</kai-button>
      <kai-button slot="footer-actions">Open</kai-button>
    </kai-card>
  ),
  parameters: src(`<kai-card>
  <h3 slot="header">Weekly report</h3>
  <kai-button slot="header-actions" variant="ghost" size="icon-sm"
              icon="sliders-horizontal" label="Settings"></kai-button>

  Generated just now from your last seven days of activity.

  <kai-button slot="footer-actions" variant="subtle">Dismiss</kai-button>
  <kai-button slot="footer-actions">Open</kai-button>
</kai-card>`),
};

/** Footer actions are a right-aligned row when there is room, and stack
 *  vertically (end-aligned) when the card is too narrow — a container query on
 *  the card's own width, built into the footer. Same markup, two widths. */
export const FooterActionsResponsive: Story = {
  render: () => (
    <div class="flex flex-col gap-4">
      <div class="w-[460px]">
        <kai-card>
          <h3 slot="header" class="font-semibold">Wide enough — a row</h3>
          Delete this workspace? This cannot be undone.
          <kai-button slot="footer-actions" variant="subtle">Cancel</kai-button>
          <kai-button slot="footer-actions" variant="destructive">Delete</kai-button>
        </kai-card>
      </div>
      <div class="w-[280px]">
        <kai-card>
          <h3 slot="header" class="font-semibold">Too narrow — stacked</h3>
          Delete this workspace? This cannot be undone.
          <kai-button slot="footer-actions" variant="subtle">Cancel</kai-button>
          <kai-button slot="footer-actions" variant="destructive">Delete</kai-button>
        </kai-card>
      </div>
    </div>
  ),
  parameters: src(`<!-- Same markup at any width. The footer collapses to a stack below the
     card's \`collapse\` width (default 28rem; set collapse="20rem" to change it).
     The primary action (authored last) ends up on top of the stack. -->
<kai-card collapse="22rem">
  <h3 slot="header">Delete workspace</h3>
  This cannot be undone.
  <kai-button slot="footer-actions" variant="subtle">Cancel</kai-button>
  <kai-button slot="footer-actions" variant="destructive">Delete</kai-button>
</kai-card>`),
};

/** A dismissible promo (the Claude "2x usage" card): filled surface, an inset
 *  illustration + title + description in the body, a full-width CTA. */
export const Promo: Story = {
  render: () => (
    <kai-card appearance="filled" dismissible class="w-[264px]">
      <div class="flex flex-col gap-3">
        <div class="flex h-20 items-center justify-center rounded-lg bg-muted">
          <Sparkles class="size-7 text-primary" />
        </div>
        <div>
          <strong class="block text-[0.9375rem] font-semibold">2× usage for Cowork</strong>
          <p class="mt-1 text-[0.8125rem] text-muted-foreground">Do more with a higher session limit, now through July 5.</p>
        </div>
        <kai-button full>Start task</kai-button>
      </div>
    </kai-card>
  ),
  parameters: src(`<kai-card appearance="filled" dismissible style="width:264px">
  <div style="display:flex;flex-direction:column;gap:0.75rem">
    <div class="illustration"><!-- an icon or image --></div>
    <div>
      <strong>2× usage for Cowork</strong>
      <p>Do more with a higher session limit, now through July 5.</p>
    </div>
    <kai-button full>Start task</kai-button>   <!-- full-width CTA -->
  </div>
</kai-card>`),
};

/** Horizontal: media fills the start column, content beside it. */
export const Horizontal: Story = {
  render: () => (
    <kai-card orientation="horizontal" class="max-w-lg">
      <img slot="media" src={IMG} alt="Sample" class="h-full w-44 object-cover" />
      <strong slot="header" class="font-semibold">Side by side</strong>
      In horizontal orientation the media fills the start column and the content fills the rest.
    </kai-card>
  ),
  parameters: src(`<kai-card orientation="horizontal">
  <img slot="media" src="/media.jpg"
       alt="Sample" style="height:100%;width:11rem;object-fit:cover" />
  <strong slot="header">Side by side</strong>
  The media fills the start column and the content fills the rest.
</kai-card>`),
};

/** Responsive: horizontal when the card's container is wide, vertical when narrow
 *  (a container query on the card's OWN width). Same markup, two widths. */
export const Responsive: Story = {
  render: () => (
    <div class="flex flex-col gap-4">
      <div class="w-[560px]">
        <kai-card orientation="responsive">
          <img slot="media" src={IMG} alt="Sample" class="h-40 w-full object-cover @min-[28rem]:h-full @min-[28rem]:w-48" />
          <strong slot="header" class="font-semibold">Wide — side by side</strong>
          Above ~28rem of card width the media moves to the start.
        </kai-card>
      </div>
      <div class="w-[300px]">
        <kai-card orientation="responsive">
          <img slot="media" src={IMG} alt="Sample" class="h-40 w-full object-cover @min-[28rem]:h-full @min-[28rem]:w-48" />
          <strong slot="header" class="font-semibold">Narrow — stacked</strong>
          Below it the media moves back on top.
        </kai-card>
      </div>
    </div>
  ),
  parameters: src(`<!-- horizontal when wide, vertical when narrow — keyed to the card's
     OWN width, not the viewport. The breakpoint is the \`collapse\` prop
     (default 28rem). -->
<kai-card orientation="responsive" collapse="28rem">
  <img slot="media" src="/media.jpg" alt="Sample" />
  <strong slot="header">Adapts to its container</strong>
  Above the collapse width the media moves to the start.
</kai-card>`),
};

/** The whole card as one clickable target (no inner action buttons). */
export const Clickable: Story = {
  render: () => (
    <kai-card clickable class="max-w-sm">
      <strong class="block font-semibold">Open the workspace</strong>
      <p class="mt-1 text-sm text-muted-foreground">The entire card is a single button. Press Enter or Space when focused.</p>
    </kai-card>
  ),
  parameters: src(`<kai-card clickable>
  <strong>Open the workspace</strong>
  <p>The entire card is a single button.</p>
</kai-card>
<script type="module">
  document.querySelector('kai-card')
    .addEventListener('kai-card-click', () => openWorkspace());
</script>`),
};
