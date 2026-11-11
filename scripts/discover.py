#!/usr/bin/env python3
"""Map the API with GET only; never execute POST commands during a build."""
import argparse
import base64
import concurrent.futures
import datetime
import json
import os
from pathlib import Path
import sys
import urllib.error
import urllib.parse
import urllib.request

PROJECT = Path(__file__).resolve().parents[1]

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

class Discovery:
    def __init__(self, base_url, root='/v2', workers=8, max_nodes=3000, max_depth=12, timeout=10, auth=None):
        parsed = urllib.parse.urlsplit(base_url)
        if parsed.scheme not in ('http', 'https') or not parsed.netloc or parsed.username or parsed.query or parsed.fragment or parsed.path not in ('', '/'):
            raise ValueError('API URL must be an HTTP(S) origin, without credentials or a path')
        if auth and parsed.scheme != 'https':
            raise ValueError('Credentials require HTTPS')
        if not root.startswith('/') or root.startswith('//') or '?' in root or '#' in root or any(p in ('.', '..') for p in root.split('/')):
            raise ValueError('Discovery root must be an absolute API path without query or fragment')
        self.base_url = base_url.rstrip('/')
        self.root = root.rstrip('/') or '/'
        self.workers, self.max_nodes, self.max_depth, self.timeout = workers, max_nodes, max_depth, timeout
        self.auth = auth
        self.opener = urllib.request.build_opener(NoRedirect())

    def get(self, path):
        headers = {'Accept': 'application/json'}
        if self.auth:
            headers['Authorization'] = self.auth
        try:
            with self.opener.open(urllib.request.Request(self.base_url + path, headers=headers), timeout=self.timeout) as response:
                raw = response.read(2_000_001)
                if len(raw) > 2_000_000:
                    return {'status': response.status, 'error': 'Discovery response exceeds 2 MB'}
                try:
                    return {'status': response.status, 'payload': json.loads(raw)}
                except (ValueError, UnicodeError):
                    return {'status': response.status, 'error': 'Expected JSON discovery response'}
        except urllib.error.HTTPError as error:
            status = error.code
            error.close()
            return {'status': status, 'error': f'HTTP {status}'}
        except (OSError, urllib.error.URLError) as error:
            return {'status': 0, 'error': type(error).__name__}

    def crawl(self):
        nodes, warnings, frontier, count = {}, [], [(self.root, 0)], 0
        # Lists may contain either path segments or command codes. Probe each once;
        # 404 identifies an unresolvable entry, not proof of a callable command.
        with concurrent.futures.ThreadPoolExecutor(max_workers=self.workers) as pool:
            while frontier:
                if count + len(frontier) > self.max_nodes:
                    raise RuntimeError(f'Discovery exceeded {self.max_nodes} requests; increase --max-nodes')
                results = list(pool.map(self.get, [path for path, _ in frontier]))
                count += len(frontier)
                following = []
                for (path, depth), result in zip(frontier, results):
                    status = result['status']
                    if status in (401, 403):
                        raise RuntimeError(f'Authentication/access denied at {path} (HTTP {status})')
                    if path == self.root and ('error' in result or status != 200):
                        raise RuntimeError(f'Cannot discover {path}: {result.get("error", status)}')
                    if status == 404:
                        continue
                    node = {'path': path, 'name': urllib.parse.unquote(path.rsplit('/', 1)[-1]), 'status': status, 'children': [], 'commands': []}
                    nodes[path] = node
                    if 'error' in result or status != 200:
                        node['error'] = result.get('error', f'HTTP {status}')
                        warnings.append(f'{path}: {node["error"]}; calling convention unavailable')
                        continue
                    payload = result['payload']
                    value = payload.get('data') if isinstance(payload, dict) else payload
                    entries = value if isinstance(value, list) else value.get('codes') if isinstance(value, dict) else None
                    if not isinstance(entries, list) or not all(isinstance(item, (str, int, float)) and not isinstance(item, bool) for item in entries):
                        node['error'] = 'No supported discovery list or data.codes array'
                        warnings.append(f'{path}: {node["error"]}')
                        continue
                    node['entries'] = list(dict.fromkeys(str(item) for item in entries))
                    node['format'] = 'codes' if isinstance(value, dict) else 'list'
                    if isinstance(value, dict):
                        node['commands'] = node['entries'][:]
                        # Do not serialize arbitrary device state or metadata into public assets.
                        continue
                    if depth >= self.max_depth and entries:
                        raise RuntimeError(f'Discovery exceeded --max-depth at {path}')
                    for entry in node['entries']:
                        if entry in ('', '.', '..') or '/' in entry or '\\' in entry:
                            warnings.append(f'{path}: entry {entry!r} cannot be safely probed as a segment')
                            continue
                        following.append((path.rstrip('/') + '/' + urllib.parse.quote(entry, safe=''), depth + 1))
                frontier = following
        for path, node in nodes.items():
            if node.get('format') == 'list':
                for entry in node['entries']:
                    child = path.rstrip('/') + '/' + urllib.parse.quote(entry, safe='')
                    if child in nodes:
                        node['children'].append(child)
                    else:
                        node['commands'].append(entry)
            if node['commands']:
                node['convention'] = 'inferred-post-query-code'
        warnings.append('GET discovery does not explicitly declare HTTP methods, parameter schemas, required arguments or examples. The agreed POST ?code= convention is not declared by discovery; verify per service.')
        return {'version': 1, 'baseURL': self.base_url, 'root': self.root,
                'generatedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
                'requestCount': count, 'nodes': nodes, 'warnings': warnings}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url', default=os.getenv('API_BASE_URL', 'https://api.kennedn.com'))
    parser.add_argument('--root', default='/v2')
    parser.add_argument('--output', type=Path, default=PROJECT / 'data/api.json')
    parser.add_argument('--workers', type=int, default=8)
    parser.add_argument('--max-nodes', type=int, default=3000)
    parser.add_argument('--max-depth', type=int, default=12)
    parser.add_argument('--timeout', type=float, default=10)
    args = parser.parse_args()
    if min(args.workers, args.max_nodes, args.max_depth, args.timeout) <= 0:
        parser.error('Limits must be positive')
    username, password = os.getenv('API_USERNAME'), os.getenv('API_PASSWORD')
    if bool(username) != bool(password):
        parser.error('Set both API_USERNAME and API_PASSWORD, or neither')
    auth = 'Basic ' + base64.b64encode(f'{username}:{password}'.encode()).decode() if username else None
    try:
        catalog = Discovery(args.base_url, args.root, args.workers, args.max_nodes, args.max_depth, args.timeout, auth).crawl()
    except (ValueError, RuntimeError) as error:
        print(f'Discovery failed: {error}', file=sys.stderr)
        return 1
    args.output.parent.mkdir(parents=True, exist_ok=True)
    temporary = args.output.with_suffix('.tmp')
    temporary.write_text(json.dumps(catalog, indent=2) + '\n')
    temporary.replace(args.output)
    print(f'Mapped {len(catalog["nodes"])} nodes with {catalog["requestCount"]} GET requests → {args.output}')
    for warning in catalog['warnings']:
        print(f'Warning: {warning}', file=sys.stderr)
    return 0

if __name__ == '__main__':
    sys.exit(main())
