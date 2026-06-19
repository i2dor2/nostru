# Nostru

A Nostr social client built as a browser sidePanel extension (Chrome MV3). It lets you read and write to the Nostr network, zap with one click via NWC, and receive Bitcoin through Silent Payments - all without ever leaving your browser.

---

## What it does

| Feature | Description |
|---------|-------------|
| **Social feed** | Home feed via Nostr outbox model (NDK), with replies, reactions, reposts, zaps |
| **Profiles** | View any Nostr profile, follow/unfollow, see follower counts |
| **Search** | Full-text search across notes, profiles, and long-form articles, with author + date filters |
| **Direct messages** | NIP-04 and NIP-44 encrypted messages (kind 4 / 1059) |
| **NWC wallet** | One-click Lightning zaps via Nostr Wallet Connect; balance display |
| **Block/mute lists** | NIP-51 mute list (kind 10000), published to relays; local block list |
| **NIP-07 bridge** | Acts as a web3-style Nostr signer for dApps; per-site permission system |
| **NSP addresses** | Derives a BIP-352 Silent Payment address from any Nostr public key - no consent from recipient needed |
| **NSP scanning** | Detects incoming Bitcoin Silent Payments via a local native host (no cloud key exposure) |
| **NSP sweep** | Builds and optionally broadcasts a signed sweep transaction entirely locally |
| **Notifications** | Background polling for mentions, zaps, DMs; system notifications |

---

## What it does NOT do

| What | Why |
|------|-----|
| Store private keys permanently | Keys live only in `chrome.storage.session` (cleared on browser close) |
| Send your scan key to any server | The scan private key is derived in-memory in the extension and passed only to the local native host process via Chrome Native Messaging - never over the network |
| Require an account to show NSP addresses | Any npub is enough to compute someone's Silent Payment address |
| Broadcast transactions automatically | Broadcasting is always an explicit user action with a dedicated button |
| Collect telemetry | Zero analytics, zero beacons, zero third-party scripts |
| Use cloud scanning | Scanning runs locally via `host.py` using a user-configured index server only for block data (tweaks), never for private keys |
| Expose transaction history | Silent Payment outputs are unlinkable on-chain; no xpub or address reuse |

---

## Every Nostr account is a Bitcoin Silent Payment receiver

Nostr identities are secp256k1 keypairs - the same elliptic curve that Bitcoin uses. BIP-352 (Silent Payments) is also built on secp256k1. This means the derivation is not a hack or a workaround: it is a direct mathematical consequence of shared curve arithmetic.

The derivation from any Nostr public key (`npub`) to a Silent Payment address (`sp1...`) works like this:

| Step | Operation | Who can do it |
|------|-----------|--------------|
| 1 | Take the x-only Nostr pubkey (32 bytes, even-Y per BIP-340) | Anyone |
| 2 | Compute `ScanPub = P + tagged_hash("nostr-sp/scan", P_compressed) * G` | Anyone |
| 3 | Compute `SpendPub = P + tagged_hash("nostr-sp/spend", P_compressed) * G` | Anyone |
| 4 | Encode as `sp1... = bech32m([0x00] + ScanPub_33 + SpendPub_33)` | Anyone |
| 5 | Detect incoming payments (derive `scan_priv`, scan blocks via ECDH) | nsec holder only |
| 6 | Spend received funds (derive `spend_priv + t_k`, sign sweep tx) | nsec holder only |

The key property: steps 1-4 require only the public key and are deterministic. **Anyone who can find your npub can pay you, without ever asking for an address, without you being online, and without any on-chain link between two payments to you.**

This means:

- **Every Nostr user is already a Bitcoin SP receiver,** whether or not they know it. The address exists the moment the keypair exists.
- **The Nostr social graph doubles as a Bitcoin payment directory.** If you follow someone, you can pay them silently just from their profile - without them ever sharing a Bitcoin address.
- **Payments survive key rotation workarounds.** A sender computes the address once from the npub and the resulting UTXOs are indistinguishable from any other P2TR output on-chain - no address reuse, no clustering, no linking across senders.
- **The recipient does not need to be running Nostru.** Any BIP-352-compatible wallet can send to an sp1 address derived from an npub. The recipient can scan later with Nostru whenever they choose.

Nostru makes this visible: open any profile in the extension and the `sp1...` address appears automatically, computed live in your browser from nothing more than the account's public key.

---

## Why an extension and not a website

Silent Payment scanning requires access to a scan private key that is root-equivalent to your Nostr private key. A website - even one served over HTTPS or from localhost - cannot handle this safely. A browser extension can.

| Capability | Extension | Website |
|------------|-----------|---------|
| Memory-only key storage inaccessible to page scripts | `chrome.storage.session` | No equivalent; JS globals are reachable by any injected script |
| Talk to a local native process | `chrome.runtime.connectNative()` | Not available - this API is extension-only |
| Inject a NIP-07 signer into every page | Content scripts with `MAIN` world access | Would require a browser extension anyway |
| Run background tasks without a visible tab | Service worker + `chrome.alarms` | Requires a server or always-open tab |
| Sidebar alongside any web page | `chrome.sidePanel` | Impossible without an extension |
| Per-origin permission system for key access | `chrome.permissions` + custom store | No standard equivalent |

**The critical blocker for a website doing NSP is Native Messaging.** `chrome.runtime.connectNative()` is only callable from extension service workers and extension pages - not from any web origin, not even `localhost`. There is no workaround.

Without Native Messaging, a website doing NSP scanning has exactly two options:

1. **Send the scan key to a server.** The scan private key is `nsec + tagged_hash(...)` - whoever holds it can monitor every Silent Payment output addressed to you, forever. Giving it to a server converts a privacy-preserving payment protocol into a surveillance tool.

2. **Scan in the browser tab with JavaScript.** BIP-352 scanning requires secp256k1 scalar multiplication for every transaction in every block since the birthday height. At typical network throughput (thousands of transactions per block, hundreds of blocks to scan), this would take hours in a browser tab - and stop the moment the tab closes.

The extension model resolves both problems cleanly:

- The background service worker derives `scan_priv` in-memory from the session-stored `nsec`.
- It passes the key directly to the local `host.py` process via a Unix pipe (Chrome Native Messaging). The pipe is private to the OS process pair.
- `host.py` performs the ECDH computation locally, queries only the per-block tweak data (not the key) from the index server, and returns only matching UTXOs.
- The scan key is never written anywhere. If the browser closes mid-scan, it is gone.

This is only possible because the extension has `chrome.runtime.connectNative()`. A website, a PWA, and a local web app served from `file://` or `localhost` all lack this capability.

---

## Why Nostru is a first

**No browser extension has ever combined a Nostr social identity with Bitcoin Silent Payments before.**

The key innovation is the NSP (Nostr Silent Payments) protocol:

1. **One key, two networks.** Your Nostr private key (`nsec`) is an secp256k1 scalar - the same curve that Bitcoin uses. Nostru derives BIP-352 scan and spend keys from it using domain-separated tagged hashes (`nostr-sp/scan`, `nostr-sp/spend`), so your single identity key becomes your Bitcoin receiving key.

2. **Send to any Nostr user, privately.** Anyone who knows your npub can compute your Silent Payment address (`sp1...`) without asking you - and without creating a link between any two payments on-chain. A sender cannot tell if you received payment by looking at the blockchain. Neither can anyone else watching.

3. **Scan key never leaves your device.** The scan private key is root-equivalent to your nsec. Nostru handles this via Chrome Native Messaging: the background service worker derives the key in-memory and passes it directly to a local Python process (`host.py`) over a Unix pipe. The key is never written to disk, never logged, never sent over a network.

4. **No blockchain node required.** Scanning uses a lightweight index server (user-configurable) that provides pre-computed per-transaction tweaks. The local host verifies the cryptographic match and only reports UTXOs that belong to you.

5. **Full sweep without third-party signing.** The local host builds and signs the BIP-341 P2TR sweep transaction entirely in Python using zero external dependencies. The extension receives the raw transaction and lets you broadcast it or copy it for manual submission.

The combination - social discovery via Nostr + silent incoming payments + local-only signing - has never existed in a single browser extension before.

---

## Architecture

```
Browser (Chrome MV3)
  sidepanel.html          <- React UI
      WalletScreen        <- NWC + NSP controls
      ProfileView         <- shows derived sp1 address for any npub
  background.ts           <- service worker
      NIP-07 bridge       <- web signer for dApps
      Notification poller <- DMs, zaps, mentions
      SP handler          <- derives keys in-memory, calls native host
         |
         | Chrome Native Messaging (stdin/stdout, 4-byte LE length prefix)
         v
  host.py (local process, no network access to keys)
      identify            <- version + capability check
      scan                <- BIP-352 ECDH scan over index server tweaks
      sweep               <- BIP-341 P2TR transaction build + Schnorr sign
```

---

## Silent Payments - How to use

### Step 1 - Install the native host

The scanning and signing logic runs as a local Python script. It has zero external dependencies (pure Python 3.9+ stdlib).

```bash
git clone https://github.com/i2dor/nostru
cd nostru/tools/nostru-sp
python3 install.py --extension-id=<YOUR_EXTENSION_ID>
```

Find your extension ID at `chrome://extensions` (enable Developer mode). The Wallet screen shows it automatically in the setup wizard.

To verify the install:

```bash
python3 install.py --verify
```

To remove:

```bash
python3 install.py --uninstall
```

### Step 2 - Unlock Nostru

Sign in with your nsec. The private key lives only in session storage and is used to derive the scan and spend keys on demand.

### Step 3 - Scan for payments

Open the Wallet screen, expand "Silent Payments (NSP)", and fill in:

| Field | What to enter |
|-------|--------------|
| SP index server | URL of a BIP-352 index (default: silentpayments.xyz/api) |
| Birthday height | The block height from which to start scanning (use the height when you first shared your sp1 address) |
| Tip height | Optional upper bound; leave blank for the server default |

Click **Scan for payments**. The local host queries the index server for per-block tweaks and performs ECDH against your scan key to find matching P2TR outputs. No private key information is sent to the index server.

### Step 4 - Sweep

Once UTXOs are found, enter a destination Bitcoin address and a fee rate (sat/vB), then click **Build sweep transaction**. The local host:

1. Derives the per-output spend scalar (`b_spend + t_k mod n`)
2. Computes the BIP-341 sighash for each input
3. Signs with BIP-340 Schnorr using a random aux value
4. Returns the raw serialized transaction

You then either:
- **Copy raw TX** - paste into any Bitcoin broadcast tool
- **Broadcast** - sends directly to mempool.space/api/tx

---

## Receiving NSP payments (sharing your address)

Your Silent Payment address is visible on your own profile card in the extension. You can also compute anyone else's sp1 address from their npub - it appears automatically on their profile view.

Share your sp1 address the same way you share any Bitcoin address. Senders use a standard BIP-352-compatible wallet; they do not need to know about Nostr at all.

---

## Relay configuration

Default relays are listed in `src/core/ndk/config.ts`. You can add or remove relays from Settings. Changes take effect immediately.

---

## Permissions

| Permission | Why |
|------------|-----|
| `storage` | Save accounts, relays, blocks, mutes, NWC URI |
| `sidePanel` | Open as browser sidebar |
| `nativeMessaging` | Connect to `nostru.sp` local host for Silent Payment scan/sweep |
| `notifications` | System notifications for mentions, zaps, DMs |
| `alarms` | Background polling every 5 minutes |
| `windows` | Open NIP-07 approval popup |
| `host_permissions: https://*/*` | LNURL resolution, NWC, Lightning invoice fetch |

---

## Building from source

```bash
npm install
npm run build        # production build -> dist/chrome-mv3/
npm run dev          # HMR dev mode
npm test             # vitest unit tests
```

Load `dist/chrome-mv3/` as an unpacked extension in Chrome.

---

## Security notes

- **nsec never leaves the browser.** The raw private key is stored in `chrome.storage.session` (memory only, cleared on browser close) and accessed only by the background service worker.
- **scan_priv and spend_priv are derived on demand** and passed only to the native host via stdin. They are never written to disk, never logged, never included in any network request.
- **The native host is sandboxed.** Chrome Native Messaging limits the host to communicating only with extensions that list its name in `allowed_origins`. The host binary path and the allowed extension ID are set at install time.
- **No secrets in this repository.** Setup docs use placeholders; tests use generated throwaway keys.
- **BIP-352 output unlinkability** means that even if the index server is compromised, it learns only that someone scanned a block range - not which outputs belong to you, because the ECDH step happens locally.
