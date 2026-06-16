import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { onMount } from 'solid-js';
import './register'; // side effect: registers the custom elements
import { argTypesFor, specDescription } from '../stories/docs/element-controls';

// The web components are custom DOM elements, so declare the tags for JSX.
declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kc-feedback-bar': JSX.HTMLAttributes<HTMLElement> & {
        'bar-title'?: string;
        'collect-detail'?: boolean | string;
        'detail-title'?: string;
        'thanks-message'?: string;
        'on:kc-feedback'?: (e: CustomEvent<{ value: 'helpful' | 'not-helpful' }>) => void;
        'on:kc-feedback-detail'?: (e: CustomEvent<{ value: 'helpful' | 'not-helpful'; category?: string; comment?: string }>) => void;
        'on:kc-close'?: (e: CustomEvent) => void;
      };
    }
  }
}

const HTML_SNIPPET = `<!-- Works in any framework or plain HTML -->
<kc-feedback-bar bar-title="Was this helpful?"></kc-feedback-bar>

<script type="module">
  import '@kitn.ai/chat/elements';   // registers the custom elements

  const bar = document.querySelector('kc-feedback-bar');
  bar.addEventListener('kc-feedback', (e) => console.log('feedback:', e.detail.value)); // 'helpful' | 'not-helpful'
  bar.addEventListener('kc-close', () => bar.remove());
</script>`;

const meta = {
  title: 'Components/FeedbackBar',
  tags: ['autodocs'],
  argTypes: argTypesFor('kc-feedback-bar'),
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: specDescription('kc-feedback-bar', [
          '`<kc-feedback-bar>` is the framework-agnostic **web component** for an inline thumbs up/down feedback banner — isolated in **Shadow DOM**. It owns its own flow: it asks, optionally collects a category + comment on a not-helpful vote (`collect-detail`), then confirms with a thank-you in place. It does **not** disappear on a vote; only the close (X) dismisses it.',
          '**When to use:** collecting a quick reaction (optionally with a reason) after an answer or a completed task. In SolidJS, use the `FeedbackBar` primitive.',
          "**How to use:** register once with `import '@kitn.ai/chat/elements'`, set the label via the `bar-title` attribute (`title` is avoided — it's a global HTML attribute). For the richer flow add `collect-detail` and set the `categories` **property** (array). Listen for `kc-feedback` (`{ value }`), `kc-feedback-detail` (`{ value, category?, comment? }`), and `kc-close` **CustomEvents**.",
          'See the **Code** tab for HTML usage.',
        ]),
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** The default feedback prompt. */
export const Default: Story = {
  render: () => (
    <div style={{ padding: '24px', 'max-width': '480px' }}>
      <kc-feedback-bar
        on:kc-feedback={(e) => console.log('feedback:', e.detail.value)}
        on:kc-close={() => console.log('closed')}
      />
    </div>
  ),
  parameters: { docs: { source: { code: HTML_SNIPPET, language: 'html' } } },
};

/** A custom label via the `bar-title` attribute. */
export const CustomTitle: Story = {
  render: () => (
    <div style={{ padding: '24px', 'max-width': '480px' }}>
      <kc-feedback-bar bar-title="Did this answer your question?" />
    </div>
  ),
};

/** The full flow with `collect-detail` — a 👎 vote opens an optional detail form
 *  (category chips from the `categories` property + a comment) before the thanks. */
export const WithDetail: Story = {
  render: () => {
    let el: (HTMLElement & { categories?: string[] }) | undefined;
    onMount(() => {
      if (el) el.categories = ['Inaccurate', 'Not helpful', 'Unsafe', 'Other'];
    });
    return (
      <div style={{ padding: '24px', 'max-width': '480px' }}>
        <kc-feedback-bar
          ref={(e) => (el = e as HTMLElement)}
          bar-title="Was this response helpful?"
          collect-detail
          on:kc-feedback={(e) => console.log('vote:', e.detail.value)}
          on:kc-feedback-detail={(e) => console.log('detail:', e.detail)}
          on:kc-close={() => console.log('closed')}
        />
      </div>
    );
  },
  parameters: {
    docs: {
      source: {
        code: `<kc-feedback-bar id="fb" bar-title="Was this response helpful?" collect-detail></kc-feedback-bar>
<script type="module">
  import '@kitn.ai/chat/elements';
  const fb = document.getElementById('fb');
  fb.categories = ['Inaccurate', 'Not helpful', 'Unsafe', 'Other']; // chips (a JS property)
  fb.addEventListener('kc-feedback', (e) => console.log('vote:', e.detail.value));
  fb.addEventListener('kc-feedback-detail', (e) => console.log('detail:', e.detail)); // { value, category?, comment? }
  fb.addEventListener('kc-close', () => fb.remove());
</script>`,
        language: 'html',
      },
    },
  },
};
