// NavContext is React glue; behaviour is verified through Shell integration.
// This file confirms the module exports are present after the conversation nav addition.

import { describe, it, expect } from 'vitest';

describe('NavContext module API', () => {
  it('exports NavProvider and useNav as functions', async () => {
    const { NavProvider, useNav } = await import('./NavContext');
    expect(typeof NavProvider).toBe('function');
    expect(typeof useNav).toBe('function');
  });
});
