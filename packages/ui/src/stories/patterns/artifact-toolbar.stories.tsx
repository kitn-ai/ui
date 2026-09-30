import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { onMount } from 'solid-js';
import '../../web-components/register/register'; // every kai-* element the pattern uses
// The pattern's own files, so the story shows what `kai add artifact-toolbar` writes
// and cannot drift from it.
import patternHtml from '../../../../blocks/patterns/artifact-toolbar/artifact-toolbar.html?raw';
import patternScript from '../../../../blocks/patterns/artifact-toolbar/artifact-toolbar.js?raw';

const meta = { title: 'Patterns/Artifact Toolbar', parameters: { layout: 'padded' } } satisfies Meta;
export default meta;
type Story = StoryObj;

/** The page body and inline style of the pattern's HTML, without its `<script>` tag. */
function pageMarkup(): string {
  const doc = new DOMParser().parseFromString(patternHtml, 'text/html');
  doc.querySelectorAll('script').forEach((s) => s.remove());
  return doc.head.querySelector('style')!.outerHTML + doc.body.innerHTML;
}

export const ComposedToolbar: Story = {
  parameters: {
    docs: {
      source: {
        language: 'html',
        code: `<kai-artifact id="viewer" src="https://example.com/">
  <div slot="toolbar">
    <kai-button id="back" icon="arrow-left" label="Back" disabled></kai-button>
    <kai-button id="forward" icon="arrow-right" label="Forward" disabled></kai-button>
    <kai-button id="reload" icon="rotate-cw" label="Reload"></kai-button>
    <kai-input id="address" size="xs" readonly aria-label="Address"></kai-input>
    <kai-button id="open" icon="external-link" label="Open in new tab" disabled></kai-button>
  </div>
</kai-artifact>
<!-- kai add artifact-toolbar writes the page and the script that drives it. -->`,
      },
    },
  },
  render: () => {
    let host!: HTMLDivElement;
    onMount(async () => {
      host.innerHTML = pageMarkup();
      // The kit is already registered above, so the script's own import line is dropped;
      // everything else runs as shipped, against the markup now in the document.
      const source = patternScript.replace(/^import '@kitn\.ai\/ui\/web-components';\n/m, '');
      const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
      await import(/* @vite-ignore */ url);
      URL.revokeObjectURL(url);
    });
    return <div ref={host} />;
  },
};

/** A code viewer: an empty `slot="toolbar"` element removes the bar entirely. */
export const NoToolbar: Story = {
  parameters: {
    docs: {
      source: {
        language: 'html',
        code: `<kai-artifact default-tab="code" active-file="hello.js">
  <div slot="toolbar"></div>
</kai-artifact>`,
      },
    },
  },
  render: () => (
    <div
      ref={(host) => {
        host.innerHTML =
          '<kai-artifact style="display:block;height:24rem" default-tab="code" active-file="hello.js">' +
          '<div slot="toolbar"></div></kai-artifact>';
        const el = host.firstElementChild as HTMLElement & Record<string, unknown>;
        el.files = [{ path: 'hello.js', code: "console.log('hello');\n", language: 'javascript', type: 'js' }];
      }}
    />
  ),
};
