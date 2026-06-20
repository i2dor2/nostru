# Indexed Deterministic Payment Identities Implementation Plan

Created: 2026-06-20
Agent: Claude Code
Status: COMPLETE
Approved: Yes
Iterations: 1
Worktree: No
Type: Feature

## Summary

**Goal:** In Deterministic payment mode, the user can switch between multiple Silent Payment identities indexed by N, advance to a brand-new identity (auto-published as NIP-352), and step back to any earlier index to scan/sweep its funds - all derived from the one nsec, nothing extra stored as a secret.

## Context

Today the Deterministic mode has exactly one slot: `derivePaymentPriv` hardcodes the tag `'nostr-payment/v1'`, so one nsec yields one deterministic SP address forever. The user wants the Nostr equivalent of "rotate to a new wallet": generate identity #2, #3, ... from the same nsec, each with its own SP address, while keeping old ones recoverable. Because the existing tag is `'nostr-payment/v1'`, parametrizing the tag as `nostr-payment/v${N}` makes **N=1 reproduce today's deterministic identity exactly** - so this is a pure backward-compatible extension, not a migration. The Independent mode (random, AES-encrypted key) stays as-is for users who want full isolation.

## Approach

**Chosen:** Index-parametrize the existing deterministic derivation (`derivePaymentPriv(priv, N)` -> tag `nostr-payment/v${N}`), persist the active index per social pubkey (new `identityIndex` store, mirroring `customSp.ts`), thread the UI-selected index through scan messages into `resolveScanKeys`, and add a stepper + "New identity" control to `SpSection` in WalletScreen.

**Why:** Reuses the proven `derivePrivOffset` tagged-hash mechanism and the per-pubkey storage pattern already in the codebase. N=1 == current identity means zero migration and no risk to already-published addresses. The selected index is the single source of truth, passed explicitly in each scan request, so the service worker needs no extra storage read.

## Out of Scope

- Custom SP override (`customSp.ts`) precedence is unchanged: when a custom address is set it still wins for display/publish regardless of selected index. Not reworked here.
- Independent and Social modes are untouched - the stepper appears only in Deterministic mode.
- No automatic detection of "which indices have received funds" - the user advances/steps manually.

## Autonomous Decisions

- **Index is per social pubkey**, not global, because the app is multi-account (`AccountContext` / accounts store). Follows the `customSp.ts` / `paymentKey.ts` per-pubkey keying.
- **Index starts at 1** (not 0) so index 1 maps to the existing `'nostr-payment/v1'` identity.
- **Scan requests always carry `paymentIndex`** (default 1); `resolveScanKeys` ignores it for social/independent modes, so sending it unconditionally is harmless and keeps the message shape uniform.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Changing `derivePaymentPriv` default breaks the existing deterministic identity | Low | High (funds sent to v1 become unscannable) | Default param `index = 1` + a regression test asserting `derivePaymentPriv(p) === derivePaymentPriv(p, 1)` and equals the value at literal tag `nostr-payment/v1`. |
| Stale React closure sends wrong index/mode on scan | Medium | Medium (scans wrong identity) | Add `paymentMode` and `identityIndex` to the affected `useCallback` dependency arrays while threading the index. |

## Progress Tracking

- [x] Task 1: Index-parametrize `derivePaymentPriv`
- [x] Task 2: Per-pubkey `identityIndex` store
- [x] Task 3: Thread selected index into `resolveScanKeys` + background scan requests
- [x] Task 4: Identity stepper + auto-publishing "New identity" in WalletScreen

## Implementation Tasks

### Task 1: Index-parametrize the deterministic payment key

**Objective:** Make the deterministic payment privkey depend on an index so one nsec yields a sequence of identities. Index 1 must reproduce the current single deterministic identity byte-for-byte.

**Files:**

- Modify: `src/core/nsp.ts`
- Test: `src/core/nsp.test.ts`

**Key Decisions / Notes:**

- Change `derivePaymentPriv(privkeyHex: string, index = 1)`; tag becomes `` `nostr-payment/v${index}` `` (line 62-64). With `index = 1` the tag is the literal `'nostr-payment/v1'` used today.
- Reuses the existing private `derivePrivOffset` helper - no new crypto.

**Definition of Done:**

- [ ] `derivePaymentPriv(p)` equals `derivePaymentPriv(p, 1)` for a known test priv (backward-compat guard).
- [ ] `derivePaymentPriv(p, 2) !== derivePaymentPriv(p, 1)` and is deterministic across calls.
- [ ] Verify: `npx vitest run src/core/nsp.test.ts`

### Task 2: Per-pubkey identity index store

**Objective:** Persist the active identity index per social pubkey so the selection survives reloads and account switches, defaulting to 1.

**Files:**

- Create: `src/core/store/identityIndex.ts`
- Test: `src/core/store/identityIndex.test.ts`

**Key Decisions / Notes:**

- Mirror `src/core/store/customSp.ts`: `const PREFIX = 'nostru:identityIndex:'`; `getIdentityIndex(pubkey): Promise<number>` returns stored value or `1`; `setIdentityIndex(pubkey, n)` stores `Math.max(1, Math.floor(n))`.
- Test with the in-memory `chrome.storage.local` mock pattern from `src/core/store/relays.test.ts` / `settings.test.ts`.

**Definition of Done:**

- [ ] `getIdentityIndex` returns `1` when nothing stored.
- [ ] `setIdentityIndex(pk, 3)` then `getIdentityIndex(pk)` returns `3`.
- [ ] `setIdentityIndex(pk, 0)` clamps to `1`.
- [ ] Verify: `npx vitest run src/core/store/identityIndex.test.ts`

### Task 3: Thread the selected index into scan key resolution

**Objective:** Let scan/sweep operations use the selected identity's keys by passing the index from the UI through the background message into `resolveScanKeys`.

**Files:**

- Modify: `src/core/sp/scanKeys.ts`
- Modify: `entrypoints/background.ts`
- Test: `src/core/sp/scanKeys.test.ts`

**Key Decisions / Notes:**

- `resolveScanKeys(mode, socialPrivHex, socialPubkeyHex, index = 1)`; deterministic branch (line 17-24) calls `derivePaymentPriv(socialPrivHex, index)`. Social/independent branches ignore `index`.
- `background.ts`: add `paymentIndex?: number` to the `SpRequest` interface (line 6-18); pass `req.paymentIndex` as the 4th arg in every `resolveScanKeys(...)` call (scan, scan_esplora, scan_tx, scan_frigate, sweep).

**Definition of Done:**

- [ ] `resolveScanKeys('deterministic', priv, pub, 2)` yields keys derived from `derivePaymentPriv(priv, 2)`, differing from index 1.
- [ ] `resolveScanKeys('deterministic', priv, pub)` (no index) still equals the index-1 result (existing test stays green).
- [ ] Verify: `npx vitest run src/core/sp/scanKeys.test.ts`

### Task 4: Identity stepper and auto-publishing "New identity" in WalletScreen

**Objective:** In Deterministic mode, show the active index with a stepper that drives the displayed SP address, Publish, and all scans; add a "New identity" button that advances the index and immediately publishes the new NIP-352 address.

**Files:**

- Modify: `src/ui/screens/WalletScreen.tsx`

**Key Decisions / Notes:**

- New state `identityIndex` (default 1); load via `getIdentityIndex(pubkey)` in an effect when `paymentMode === 'deterministic'` and unlocked (alongside the existing independent-key effect, line 210-214).
- `derivedSpAddress` deterministic branch (line 194-197) -> `deriveNspAddress(privToXonlyPubHex(derivePaymentPriv(privHex, identityIndex)))`; `handlePublish` deterministic branch (line 229-231) -> same index.
- Stepper UI rendered only when `paymentMode === 'deterministic'` (near the identity pills, line 512-520): `◀ N ▶` using existing Tabler chevrons; `◀` disabled at 1. On step: `setIdentityIndex` state + `setIdentityIndex(pubkey, n)` persist + reset `publishedAt`.
- "New identity" button: `const next = identityIndex + 1` -> set state, persist, then publish the address derived at `next`. Reuse `publishNip352Address(ndk, addr, 'mainnet', privToXonlyPubHex(derivePaymentPriv(priv, next)))`; surface errors via existing `publishErr`/`publishedAt`. Guard on `session.status === 'unlocked'` and `ndk`.
- Add `paymentIndex: identityIndex` to every `sendToBackground` scan call (handleScan / handleScanTx / handleScanEsplora / handleScanFrigate). Add `paymentMode` and `identityIndex` to the affected `useCallback` dependency arrays (fixes the pre-existing stale-`paymentMode` closure).
- No unit test: vitest runs in `node` env over `src/**/*.test.ts` only and cannot mount TSX. Behavior is covered by Tasks 1-3 unit tests; UI verified in-browser (below). `Trivial:` does not apply (this is the main UI surface) - verification is the unpacked-extension check.

**Definition of Done:**

- [ ] In Deterministic mode, stepping the index changes the displayed `sp1...` address; `◀` is disabled at index 1.
- [ ] "New identity" increments the index, shows the new address, and reports "Published" (or a publish error) without a manual Publish click.
- [ ] Selecting a lower index then scanning sends that index to the background (the displayed address matches the scanned identity).
- [ ] Verify: `npm run build` succeeds; load `.output/chrome-mv3` as an unpacked extension, unlock, open Wallet -> Silent Payments, switch to Det., exercise the stepper and "New identity".

## E2E Test Scenarios

**TS-001 (manual, unpacked extension):** Unlock with a test nsec -> Wallet -> Silent Payments -> Identity: Det. Confirm an index control shows "1" and an `sp1...` address. Click ▶ (or "New identity"): index becomes 2, the address changes, and "Published" appears. Click ◀ back to 1: the original address returns. (Native-host scanning at a given index is covered by the Task 3 unit test; on-chain sweep needs the native host and is not exercised here.)

## Goal Verification

### Truths

1. The same nsec produces a stable, distinct SP address for each index, and index 1 equals the address the user already had before this change (no existing deterministic identity is lost).
2. A scan/sweep initiated while a given index is selected operates on that index's keys, so funds sent to any past identity remain recoverable by stepping back to it.
