import { describe, it, expect } from 'vitest';
import { render, screen } from '@solidjs/testing-library';
import { Checkpoint, CheckpointTrigger } from '../../src/components/checkpoint';

describe('CheckpointTrigger', () => {
  it('renders without a tooltip', () => {
    render(() => (
      <Checkpoint>
        <CheckpointTrigger>Checkpoint</CheckpointTrigger>
      </Checkpoint>
    ));
    expect(screen.getByText('Checkpoint')).toBeTruthy();
  });

  it('renders with a tooltip without throwing (regression: shared-node HierarchyRequestError)', () => {
    // Before the fix this threw HierarchyRequestError because the button node was
    // shared between the Show fallback and the Tooltip child.
    expect(() =>
      render(() => (
        <Checkpoint>
          <CheckpointTrigger tooltip="Restore this checkpoint">Checkpoint</CheckpointTrigger>
        </Checkpoint>
      )),
    ).not.toThrow();
    expect(screen.getByText('Checkpoint')).toBeTruthy();
  });
});
