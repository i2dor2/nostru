"""Tests for host.py security guards and core helpers."""
import importlib.util
import io
import json
import struct
import sys
from pathlib import Path

import pytest

# Load host.py directly - it is not a package
_spec = importlib.util.spec_from_file_location('host', Path(__file__).parent / 'host.py')
assert _spec and _spec.loader
host = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(host)  # type: ignore[union-attr]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _fake_stdin(data: bytes):
    """Context manager that replaces sys.stdin.buffer with a BytesIO."""
    class _Fake:
        buffer = io.BytesIO(data)
    old = sys.stdin
    sys.stdin = _Fake()  # type: ignore[assignment]
    return old


# ---------------------------------------------------------------------------
# action_identify
# ---------------------------------------------------------------------------

class TestActionIdentify:
    def test_returns_ok_with_capabilities(self):
        r = host.action_identify({})
        assert r['status'] == 'ok'
        assert set(r['capabilities']) >= {'scan', 'sweep'}
        assert 'version' in r


# ---------------------------------------------------------------------------
# action_scan - URL validation (security guard added in this session)
# ---------------------------------------------------------------------------

class TestActionScanUrlValidation:
    _BASE = {
        'scan_priv': '1' * 64,
        'spend_pub': '02' + 'ab' * 32,
    }

    def _req(self, server: object) -> dict:
        return {**self._BASE, 'server': server}

    def test_rejects_file_url(self):
        r = host.action_scan(self._req('file:///etc/passwd'))
        assert r['status'] == 'error'
        assert 'https://' in r['error']

    def test_rejects_plain_http(self):
        r = host.action_scan(self._req('http://example.com'))
        assert r['status'] == 'error'
        assert 'https://' in r['error']

    def test_rejects_integer_server(self):
        r = host.action_scan(self._req(12345))
        assert r['status'] == 'error'

    def test_rejects_empty_string(self):
        r = host.action_scan(self._req(''))
        assert r['status'] == 'error'

    def test_rejects_javascript_url(self):
        r = host.action_scan(self._req('javascript:alert(1)'))
        assert r['status'] == 'error'

    def test_accepts_valid_https_url(self):
        # A valid https:// URL passes the guard; it will fail later at network
        # level (RuntimeError from fetch_tweaks) - not status:'error' from guard.
        # We only check the guard doesn't reject it prematurely.
        r = host.action_scan(self._req('https://silentpayments.xyz/api'))
        # Guard passed; network will fail in test env - that is expected.
        assert r.get('status') in ('ok', 'error')
        if r['status'] == 'error':
            assert 'https://' not in r['error']  # error is from network, not from guard


# ---------------------------------------------------------------------------
# recv() - size guard (security guard added in this session)
# ---------------------------------------------------------------------------

class TestRecvSizeGuard:
    def _with_stdin(self, data: bytes, fn):
        old = _fake_stdin(data)
        try:
            return fn()
        finally:
            sys.stdin = old  # type: ignore[assignment]

    def test_raises_on_oversized_message(self):
        oversized_len = (host._MAX_MSG + 1).to_bytes(4, 'little')
        with pytest.raises(ValueError, match='message too large'):
            self._with_stdin(oversized_len, host.recv)

    def test_raises_eof_on_short_header(self):
        with pytest.raises(EOFError):
            self._with_stdin(b'\x00\x00', host.recv)

    def test_parses_valid_message(self):
        payload = json.dumps({'action': 'identify'}).encode()
        data = struct.pack('<I', len(payload)) + payload
        result = self._with_stdin(data, host.recv)
        assert result == {'action': 'identify'}

    def test_accepts_message_at_exact_limit(self):
        # A message exactly at _MAX_MSG should not be rejected by the guard
        payload = b'x' * host._MAX_MSG
        # craft header only - we don't actually need to read the payload
        header = struct.pack('<I', host._MAX_MSG)
        full = header + payload
        result_bytes = io.BytesIO(full)

        class _Fake:
            buffer = result_bytes

        old = sys.stdin
        sys.stdin = _Fake()  # type: ignore[assignment]
        try:
            # json.JSONDecodeError expected - payload is not valid JSON
            with pytest.raises(json.JSONDecodeError):
                host.recv()
        finally:
            sys.stdin = old  # type: ignore[assignment]


# ---------------------------------------------------------------------------
# tagged_hash - BIP-340 domain separation
# ---------------------------------------------------------------------------

class TestTaggedHash:
    def test_deterministic(self):
        assert host.tagged_hash('t', b'd') == host.tagged_hash('t', b'd')

    def test_tag_separation(self):
        assert host.tagged_hash('tag1', b'data') != host.tagged_hash('tag2', b'data')

    def test_data_sensitivity(self):
        assert host.tagged_hash('t', b'a') != host.tagged_hash('t', b'b')

    def test_returns_32_bytes(self):
        assert len(host.tagged_hash('BIP0340/aux', b'\x00' * 32)) == 32


# ---------------------------------------------------------------------------
# decode_address - bad input rejection
# ---------------------------------------------------------------------------

class TestDecodeAddress:
    def test_rejects_garbage(self):
        with pytest.raises(ValueError):
            host.decode_address('notanaddress')

    def test_rejects_no_separator(self):
        with pytest.raises(ValueError):
            host.decode_address('abcdefgh')


# ---------------------------------------------------------------------------
# build_sweep_tx - dust guard
# ---------------------------------------------------------------------------

class TestBuildSweepTxDust:
    def test_raises_on_dust_output(self):
        # fee_rate=10, 1 input: estimate_fee(1,10) = (11+58+43)*10 = 1120
        # total=600 -> out_v = -520 < 546 -> dust
        utxos = [{
            'txid': 'ab' * 32,
            'vout': 0,
            'value': 600,
            'x_only_pubkey': 'cd' * 32,
        }]
        dest_spk = bytes.fromhex('0014' + '00' * 20)
        with pytest.raises(ValueError, match='[Dd]ust'):
            host.build_sweep_tx(utxos, dest_spk, fee_rate=10, scalars=[1])
