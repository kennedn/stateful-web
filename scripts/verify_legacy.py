#!/usr/bin/env python3
"""Verify checked-in Safari 8 assets without requiring Node or npm."""
import hashlib
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]

def main():
    try:
        manifest = json.loads((ROOT / 'data/legacy.json').read_text())
        stale = [name for group in ('inputs', 'outputs') for name, expected in manifest[group].items()
                 if not (ROOT / name).is_file() or hashlib.sha256((ROOT / name).read_bytes()).hexdigest() != expected]
    except (OSError, ValueError, KeyError) as error:
        print(f'Legacy asset manifest unavailable: {error}', file=sys.stderr)
        return 1
    if stale:
        print('Safari 8 assets need regeneration: ' + ', '.join(stale), file=sys.stderr)
        print('Run: node scripts/legacy/build.cjs', file=sys.stderr)
        return 1
    print('Safari 8 assets match their source files.')
    return 0

if __name__ == '__main__':
    sys.exit(main())
