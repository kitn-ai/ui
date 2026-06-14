import { For, Show } from 'solid-js';
import { defineWebComponent } from './define';
import { Source, SourceTrigger, SourceContent, SourceList } from '../components/source';

// --- <kc-source> — a single citation link with hover preview ---

interface SourceProps extends Record<string, unknown> {
  /** The URL this citation links to (the domain also seeds the default label/favicon). */
  href?: string;
  /** Trigger label (defaults to the domain). */
  label?: string;
  /** Hover-card headline. Attribute: `headline` (`title` is avoided — it's a
   *  global HTML attribute that reflects in a CE constructor and breaks it). */
  headline?: string;
  /** Hover-card body text describing the source. */
  description?: string;
  /** Show the source's favicon next to the trigger label. */
  showFavicon?: boolean;
}

defineWebComponent<SourceProps>('kc-source', {
  href: '',
  label: undefined,
  headline: '',
  description: '',
  showFavicon: false,
}, (props, { flag }) => (
  <Show when={props.href}>
    <Source href={props.href!}>
      <SourceTrigger label={props.label} showFavicon={flag('showFavicon')} />
      <SourceContent title={props.headline ?? ''} description={props.description ?? ''} />
    </Source>
  </Show>
));

// --- <kc-sources> — a wrapped list of citation links ---

interface SourceItem {
  href: string;
  title?: string;
  description?: string;
  label?: string;
  showFavicon?: boolean;
}

interface SourceListProps extends Record<string, unknown> {
  /** The sources to render. Set as a JS property. */
  sources: SourceItem[];
  /** Show favicons on all items (per-item `showFavicon` overrides). */
  showFavicon?: boolean;
}

defineWebComponent<SourceListProps>('kc-sources', {
  sources: [],
  showFavicon: false,
}, (props, { flag }) => (
  <SourceList>
    <For each={props.sources}>
      {(s) => (
        <Source href={s.href}>
          <SourceTrigger label={s.label} showFavicon={s.showFavicon ?? flag('showFavicon')} />
          <SourceContent title={s.title ?? ''} description={s.description ?? ''} />
        </Source>
      )}
    </For>
  </SourceList>
));
