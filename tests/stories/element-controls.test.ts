/**
 * TDD tests for argTypesFor() in src/stories/docs/element-controls.ts
 *
 * The bug: element-meta.json encodes booleans as "undefined | false | true"
 * and enums as `undefined | "preview" | "code"` (double quotes + leading
 * undefined). The old helper checked for single-quoted enum parts with no
 * undefined (dead branch) and /boolean/ in the type string (never matches).
 * Everything fell through to control:'text'.
 *
 * These tests pin the CORRECT behaviour post-fix.
 */

import { describe, it, expect } from 'vitest';
import { argTypesFor } from '../../src/stories/docs/element-controls';

describe('argTypesFor', () => {
  describe('kc-artifact', () => {
    it('tab → select control with options [preview, code]', () => {
      const result = argTypesFor('kc-artifact');
      expect(result['tab']).toEqual({
        control: { type: 'select' },
        options: ['preview', 'code'],
      });
    });

    it('expandable → boolean control', () => {
      const result = argTypesFor('kc-artifact');
      expect(result['expandable']).toEqual({ control: 'boolean' });
    });

    it('standalone → boolean control', () => {
      const result = argTypesFor('kc-artifact');
      expect(result['standalone']).toEqual({ control: 'boolean' });
    });

    it('noNav → boolean control', () => {
      const result = argTypesFor('kc-artifact');
      expect(result['noNav']).toEqual({ control: 'boolean' });
    });

    it('src → text control (optional string)', () => {
      const result = argTypesFor('kc-artifact');
      expect(result['src']).toEqual({ control: 'text' });
    });
  });

  describe('kc-message', () => {
    it('role → select control with options [user, assistant]', () => {
      const result = argTypesFor('kc-message');
      expect(result['role']).toEqual({
        control: { type: 'select' },
        options: ['user', 'assistant'],
      });
    });

    it('markdown → boolean control', () => {
      const result = argTypesFor('kc-message');
      expect(result['markdown']).toEqual({ control: 'boolean' });
    });

    it('proseSize → select control', () => {
      const result = argTypesFor('kc-message');
      expect(result['proseSize']).toEqual({
        control: { type: 'select' },
        options: ['xs', 'sm', 'base', 'lg'],
      });
    });

    it('content → text control', () => {
      const result = argTypesFor('kc-message');
      expect(result['content']).toEqual({ control: 'text' });
    });
  });

  describe('kc-response-stream (number prop)', () => {
    it('speed → number control', () => {
      const result = argTypesFor('kc-response-stream');
      expect(result['speed']).toEqual({ control: 'number' });
    });
  });

  describe('unknown tag', () => {
    it('returns empty object for unknown tag', () => {
      expect(argTypesFor('kc-nonexistent')).toEqual({});
    });
  });
});
