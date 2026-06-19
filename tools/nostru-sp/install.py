#!/usr/bin/env python3
"""
Nostru Silent Payments native host installer.
Supports macOS, Linux, Windows (Chrome, Brave, Edge).

Usage:
  python3 install.py --extension-id=<chrome-extension-id>
  python3 install.py --uninstall
"""
import sys, os, json, shutil, argparse, platform, stat, subprocess, textwrap

MANIFEST_NAME  = 'nostru.sp'
HOST_FILENAME  = 'host.py'
INSTALL_DIRNAME = 'nostru-sp'

CHROME_PATHS = {
    'darwin': [
        os.path.expanduser('~/Library/Application Support/Google/Chrome/NativeMessagingHosts'),
        os.path.expanduser('~/Library/Application Support/BraveSoftware/Brave-Browser/NativeMessagingHosts'),
        os.path.expanduser('~/Library/Application Support/Microsoft Edge/NativeMessagingHosts'),
    ],
    'linux': [
        os.path.expanduser('~/.config/google-chrome/NativeMessagingHosts'),
        os.path.expanduser('~/.config/chromium/NativeMessagingHosts'),
        os.path.expanduser('~/.config/BraveSoftware/Brave-Browser/NativeMessagingHosts'),
        os.path.expanduser('~/.config/microsoft-edge/NativeMessagingHosts'),
    ],
}

WINDOWS_REGISTRY_KEYS = [
    r'Software\Google\Chrome\NativeMessagingHosts\nostru.sp',
    r'Software\BraveSoftware\Brave-Browser\NativeMessagingHosts\nostru.sp',
    r'Software\Microsoft\Edge\NativeMessagingHosts\nostru.sp',
]


def host_install_dir() -> str:
    system = platform.system().lower()
    if system == 'darwin':
        return os.path.expanduser('~/.nostru-sp')
    if system == 'linux':
        return os.path.expanduser('~/.nostru-sp')
    if system == 'windows':
        return os.path.join(os.environ.get('APPDATA', ''), 'nostru-sp')
    raise RuntimeError(f'Unsupported OS: {platform.system()}')


def manifest_paths() -> list[str]:
    system = platform.system().lower()
    if system in CHROME_PATHS:
        return CHROME_PATHS[system]
    if system == 'windows':
        # Windows uses registry; we write the manifest next to the host
        return [host_install_dir()]
    return []


def python_executable() -> str:
    # Prefer the interpreter that's running this script
    exe = sys.executable
    if exe: return exe
    for candidate in ('python3', 'python'):
        found = shutil.which(candidate)
        if found: return found
    raise RuntimeError('No Python executable found on PATH')


def build_manifest(host_path: str, extension_id: str) -> dict[str, str | list[str]]:
    return {
        'name':            MANIFEST_NAME,
        'description':     'Nostru Silent Payments native host',
        'path':            host_path,
        'type':            'stdio',
        'allowed_origins': [f'chrome-extension://{extension_id}/'],
    }


def write_manifest(manifest: dict[str, str | list[str]], dest_dir: str) -> str:
    os.makedirs(dest_dir, exist_ok=True)
    path = os.path.join(dest_dir, f'{MANIFEST_NAME}.json')
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2)
    return path


def register_windows_registry(manifest_path: str) -> None:
    try:
        import winreg
    except ImportError:
        print('  [!] winreg not available - skipping registry step')
        return
    for key_path in WINDOWS_REGISTRY_KEYS:
        try:
            key = winreg.CreateKey(winreg.HKEY_CURRENT_USER, key_path)
            winreg.SetValueEx(key, '', 0, winreg.REG_SZ, manifest_path)
            winreg.CloseKey(key)
            print(f'  [+] Registry: HKCU\\{key_path}')
        except OSError as e:
            print(f'  [!] Registry failed ({key_path}): {e}')


def remove_windows_registry() -> None:
    try:
        import winreg
    except ImportError:
        return
    for key_path in WINDOWS_REGISTRY_KEYS:
        try:
            winreg.DeleteKey(winreg.HKEY_CURRENT_USER, key_path)
            print(f'  [-] Registry removed: HKCU\\{key_path}')
        except FileNotFoundError:
            pass
        except OSError as e:
            print(f'  [!] {e}')


def install(extension_id: str) -> None:
    this_dir = os.path.dirname(os.path.abspath(__file__))
    src_host = os.path.join(this_dir, HOST_FILENAME)
    if not os.path.exists(src_host):
        raise FileNotFoundError(f'host.py not found at: {src_host}')

    install_dir = host_install_dir()
    os.makedirs(install_dir, exist_ok=True)
    dest_host = os.path.join(install_dir, HOST_FILENAME)
    shutil.copy2(src_host, dest_host)

    # Make executable and rewrite shebang to current Python
    py = python_executable()
    with open(dest_host, 'r', encoding='utf-8') as f:
        content = f.read()
    lines = content.split('\n')
    if lines[0].startswith('#!'):
        lines[0] = f'#!{py}'
        with open(dest_host, 'w', encoding='utf-8') as f:
            f.write('\n'.join(lines))
    os.chmod(dest_host, os.stat(dest_host).st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)

    # Use python wrapper on non-Unix (Windows can't exec .py directly)
    system = platform.system().lower()
    if system == 'windows':
        wrapper = os.path.join(install_dir, 'host.bat')
        with open(wrapper, 'w') as f:
            f.write(f'@echo off\n"{py}" "{dest_host}"\n')
        host_path = wrapper
    else:
        host_path = dest_host

    manifest = build_manifest(host_path, extension_id)
    paths = manifest_paths()

    print(f'\n  Host installed at: {dest_host}')
    for path_dir in paths:
        try:
            mpath = write_manifest(manifest, path_dir)
            print(f'  [+] Manifest: {mpath}')
        except OSError as e:
            print(f'  [!] Could not write to {path_dir}: {e}')

    if system == 'windows':
        mpath = write_manifest(manifest, install_dir)
        register_windows_registry(mpath)

    print()
    print('  Done! Reload the Nostru extension (chrome://extensions -> Reload).')
    print('  Then open Wallet -> Silent Payments and click "Scan".')


def uninstall() -> None:
    install_dir = host_install_dir()
    if os.path.exists(install_dir):
        shutil.rmtree(install_dir)
        print(f'  [-] Removed: {install_dir}')
    else:
        print(f'  [!] Not found: {install_dir}')

    for path_dir in manifest_paths():
        mpath = os.path.join(path_dir, f'{MANIFEST_NAME}.json')
        if os.path.exists(mpath):
            os.remove(mpath)
            print(f'  [-] Manifest removed: {mpath}')

    if platform.system().lower() == 'windows':
        remove_windows_registry()

    print('\n  Uninstall complete.')


def verify() -> None:
    """Quick self-test: confirm we can import ourselves and run 'identify'."""
    this_dir = os.path.dirname(os.path.abspath(__file__))
    host = os.path.join(this_dir, HOST_FILENAME)
    if not os.path.exists(host):
        print('  [!] host.py not found here - run from the tools/nostru-sp directory')
        return
    result = subprocess.run(
        [sys.executable, host],
        input=b'\x12\x00\x00\x00{"action":"identify"}',
        capture_output=True, timeout=10,
    )
    if len(result.stdout) >= 4:
        length = int.from_bytes(result.stdout[:4], 'little')
        msg = json.loads(result.stdout[4:4 + length])
        if msg.get('status') == 'ok':
            print(f'  [+] host.py responds correctly: {msg}')
            return
    print(f'  [!] Unexpected response from host.py: stdout={result.stdout!r} stderr={result.stderr!r}')


def main() -> None:
    p = argparse.ArgumentParser(
        description='Nostru Silent Payments native host installer',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=textwrap.dedent("""\
            Examples:
              python3 install.py --extension-id abc123def456...
              python3 install.py --uninstall
              python3 install.py --verify
        """),
    )
    p.add_argument('--extension-id', metavar='ID',
                   help='Chrome extension ID (find it at chrome://extensions)')
    p.add_argument('--uninstall', action='store_true',
                   help='Remove the native host and manifests')
    p.add_argument('--verify', action='store_true',
                   help='Self-test: confirm host.py responds correctly')
    args = p.parse_args()

    if args.verify:
        verify()
    elif args.uninstall:
        uninstall()
    elif args.extension_id:
        install(args.extension_id)
    else:
        p.print_help()
        print('\nError: --extension-id is required for installation.\n'
              'Find your extension ID at chrome://extensions (enable Developer mode).')
        sys.exit(1)


if __name__ == '__main__':
    main()
