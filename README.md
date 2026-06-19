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
