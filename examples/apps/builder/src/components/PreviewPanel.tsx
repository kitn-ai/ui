/**
 * The right-hand panel: the running page, its source, its version history and
 * the device-width frame.
 *
 * The artifact's toolbar is composed in its `toolbar` slot: reload, home, a
 * read-only address and the Preview|Code toggle (no back/forward, since every
 * page here is a single document). The toggle drives the artifact's controlled
 * `tab` prop, and `kai-tab-change` keeps `tab` in step with the element.
 */
import { useRef } from 'react';
import { Artifact, Button, Checkpoint, Icon, Segmented } from '@kitn.ai/ui/react';
import type { KaiArtifactElement } from '@kitn.ai/ui/web-components';

import type { PageVersion } from '../versions';
import { formatBytes, pageUrl } from '../versions';

export type Device = 'desktop' | 'tablet' | 'mobile';

/** Widths the preview is CONSTRAINED to; the page itself is untouched. */
export const DEVICE_WIDTHS: Record<Device, number | null> = {
  desktop: null,
  tablet: 834,
  mobile: 390,
};

// The box the built-in bar draws: a bordered, surface-tinted strip.
const TOOLBAR_STYLE = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.375rem',
  padding: '0.375rem 0.5rem',
  borderBottom: '1px solid var(--color-border)',
  background: 'var(--color-surface)',
} as const;

// The address box, matching the built-in field: a native read-only input, since kai-input is taller.
const ADDRESS_STYLE = {
  flex: 1,
  minWidth: 0,
  height: '1.75rem',
  boxSizing: 'border-box',
  padding: '0 0.625rem',
  borderRadius: '0.375rem',
  border: '1px solid var(--color-border)',
  background: 'color-mix(in srgb, var(--color-muted) 40%, transparent)',
  color: 'var(--color-foreground)',
  font: '12px ui-monospace, SFMono-Regular, Menlo, monospace',
  outline: 'none',
} as const;

// Labels only: the kit ships 48 icon names and has no tablet/phone glyph among
// them, and an unknown `icon` renders as plain text rather than failing loudly.
const TAB_OPTIONS = [
  { value: 'preview', label: 'Preview', icon: 'eye' },
  { value: 'code', label: 'Code', icon: 'code' },
] as const;

// Native buttons in the built-in toggle's box: kai-segmented is taller than the bar's 28px row.
const TABLIST_STYLE = {
  display: 'flex',
  flexShrink: 0,
  alignItems: 'center',
  gap: '0.125rem',
  padding: '0.125rem',
  borderRadius: '0.375rem',
  background: 'var(--color-muted)',
} as const;

const tabStyle = (selected: boolean) =>
  ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.375rem',
    height: '1.5rem',
    padding: '0 0.5rem',
    border: 0,
    borderRadius: '0.25rem',
    font: '500 12px system-ui, sans-serif',
    cursor: 'pointer',
    background: selected ? 'var(--color-background)' : 'transparent',
    color: selected ? 'var(--color-foreground)' : 'var(--color-muted-foreground)',
    boxShadow: selected ? '0 1px 2px rgb(0 0 0 / 0.08)' : 'none',
  }) as const;

const DEVICE_OPTIONS = [
  { value: 'desktop', label: 'Desktop' },
  { value: 'tablet', label: 'Tablet' },
  { value: 'mobile', label: 'Mobile' },
];

type Props = {
  versions: PageVersion[];
  selected: PageVersion | null;
  tab: 'preview' | 'code';
  device: Device;
  maximized: boolean;
  streaming: boolean;
  onSelect: (id: string) => void;
  onRestore: (id: string) => void;
  onTab: (tab: 'preview' | 'code') => void;
  onDevice: (device: Device) => void;
  onToggleMaximize: () => void;
};

export function PreviewPanel(props: Props) {
  const { versions, selected, tab, device, maximized, streaming } = props;
  const head = versions.length > 0 ? versions[versions.length - 1] : null;
  const isHead = selected != null && head != null && selected.id === head.id;
  const width = DEVICE_WIDTHS[device];
  const artifact = useRef<KaiArtifactElement>(null);

  return (
    <section className="panel" aria-label="Page preview">
      <div className="panel-bar">
        <div className="panel-title">
          <span className="panel-file">{selected ? selected.fileName : 'No page yet'}</span>
          {selected && (
            <span className="panel-meta">
              {selected.label}
              {selected.restoredFrom ? ` · restored from ${selected.restoredFrom}` : ''} ·{' '}
              {formatBytes(new Blob([selected.html]).size)}
            </span>
          )}
        </div>
        <div className="panel-tools">
          <Segmented
            size="sm"
            options={DEVICE_OPTIONS}
            value={device}
            onChange={(e) => props.onDevice(e.detail.value as Device)}
          />
          <Button
            size="icon-sm"
            variant="subtle"
            icon="panel-left"
            label={maximized ? 'Restore the split layout' : 'Maximize the preview panel'}
            onClick={props.onToggleMaximize}
          />
        </div>
      </div>

      {versions.length > 0 && (
        <div className="rail" role="group" aria-label="Version checkpoints">
          <span className="rail-label">Checkpoints</span>
          <div className="rail-items">
            {versions.map((v) => (
              <Checkpoint
                key={v.id}
                size="sm"
                label={v.label}
                variant={selected?.id === v.id ? 'default' : 'ghost'}
                tooltip={`${v.label} — ${v.prompt}`}
                onSelect={() => props.onSelect(v.id)}
              />
            ))}
          </div>
          {selected && !isHead && (
            <Button size="sm" variant="outline" icon="rotate-cw" onClick={() => props.onRestore(selected.id)}>
              Restore {selected.label}
            </Button>
          )}
        </div>
      )}

      <div className={`stage device-${device}`}>
        {selected ? (
          <div className="frame" style={width ? { width: `${width}px`, maxWidth: '100%' } : undefined}>
            <Artifact
              key={selected.id}
              src={pageUrl(selected.html)}
              files={[
                {
                  path: selected.fileName,
                  url: pageUrl(selected.html),
                  code: selected.html,
                  language: 'html',
                  type: 'html',
                },
              ]}
              activeFile={selected.fileName}
              displayUrl={selected.fileName}
              tab={tab}
              ref={artifact}
              iframeTitle={`Preview of ${selected.label}`}
              onTabChange={(e) => props.onTab(e.detail.tab)}
              style={{ display: 'block', width: '100%', height: '100%' }}
            >
              <div slot="toolbar" style={TOOLBAR_STYLE}>
                <Button size="icon-sm" variant="ghost" icon="rotate-cw" label="Reload" onClick={() => artifact.current?.reload()} />
                <Button size="icon-sm" variant="ghost" icon="home" label="Home" onClick={() => artifact.current?.home()} />
                <input readOnly aria-label="Address" value={selected.fileName} style={ADDRESS_STYLE} />
                <div role="tablist" aria-label="View" style={TABLIST_STYLE}>
                  {TAB_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      role="tab"
                      aria-selected={tab === o.value}
                      style={tabStyle(tab === o.value)}
                      onClick={() => props.onTab(o.value)}
                    >
                      <Icon name={o.icon} size="sm" />
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            </Artifact>
          </div>
        ) : (
          <div className="empty">
            <h2>{streaming ? 'Building your page…' : 'No page yet'}</h2>
            <p>
              Ask for one on the left — <em>“make me a landing page for a coffee shop”</em>. Every reply that builds a
              page lands here, and every version stays as a checkpoint.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
