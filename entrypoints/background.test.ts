// background.ts is a Chrome MV3 service-worker entrypoint with no exports.
// It registers chrome.runtime event listeners on load, making direct import
// in a test environment impractical without a full Chrome API simulator.
//
// Coverage strategy:
//   - Scan key resolution logic -> src/core/sp/scanKeys.test.ts (6 tests)
//   - Payment key crypto        -> src/core/store/paymentKey.test.ts (8 tests)
//   - NSP key derivation        -> src/core/nsp.test.ts
//   - End-to-end message flow   -> manual / extension load testing

import { describe, it } from 'vitest';

describe('background entrypoint', () => {
  it('key resolution logic is covered by scanKeys.test.ts', () => {
    // See src/core/sp/scanKeys.test.ts for resolveScanKeys unit tests.
  });
});
