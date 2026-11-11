import importlib.util
import json
from pathlib import Path
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

spec = importlib.util.spec_from_file_location('discover', Path(__file__).parents[1] / 'scripts/discover.py')
discover = importlib.util.module_from_spec(spec)
spec.loader.exec_module(discover)

class DiscoveryTests(unittest.TestCase):
    def crawl(self, responses, **kwargs):
        calls = []
        class Handler(BaseHTTPRequestHandler):
            def do_GET(self):
                calls.append((self.command, self.path))
                status, data = responses.get(self.path, (404, {}))
                self.send_response(status)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(data).encode())
            def log_message(self, *_):
                pass
        server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            return discover.Discovery(f'http://127.0.0.1:{server.server_port}', **kwargs).crawl(), calls
        finally:
            server.shutdown()
            server.server_close()
            thread.join()

    def test_nested_devices_mixed_commands_codes_and_numeric_ranges(self):
        catalog, calls = self.crawl({
            '/v2': (200, {'data': ['devices', 'status', 'alert', 'tv']}),
            '/v2/devices': (200, {'data': ['room one', 'second']}),
            '/v2/devices/room%20one': (200, {'data': {'codes': ['toggle', 'status'], 'secret': 'do not publish'}}),
            '/v2/devices/second': (200, {'data': ['nested']}),
            '/v2/devices/second/nested': (200, {'data': ['on', 'off']}),
            '/v2/alert': (405, {}),
            '/v2/tv': (200, {'data': [str(i) for i in range(11)] + ['status']}),
        })
        self.assertEqual(catalog['nodes']['/v2']['commands'], ['status'])
        self.assertEqual(len(catalog['nodes']['/v2']['children']), 3)
        self.assertEqual(catalog['nodes']['/v2/devices/second/nested']['commands'], ['on', 'off'])
        self.assertEqual(catalog['nodes']['/v2/devices/room%20one']['commands'], ['toggle', 'status'])
        self.assertEqual(catalog['nodes']['/v2/tv']['commands'], [str(i) for i in range(11)] + ['status'])
        self.assertEqual(catalog['nodes']['/v2/alert']['status'], 405)
        self.assertNotIn('do not publish', json.dumps(catalog))
        self.assertTrue(all(method == 'GET' for method, _ in calls))
        self.assertFalse(any('/room%20one/' in path for _, path in calls))

    def test_auth_and_transient_errors_are_not_commands(self):
        with self.assertRaisesRegex(RuntimeError, 'Authentication/access denied'):
            self.crawl({'/v2': (200, {'data': ['private']}), '/v2/private': (401, {})})
        catalog, _ = self.crawl({'/v2': (200, {'data': ['offline']}), '/v2/offline': (503, {})})
        self.assertEqual(catalog['nodes']['/v2']['commands'], [])
        self.assertEqual(catalog['nodes']['/v2/offline']['status'], 503)

    def test_root_errors_and_limits_fail_loudly(self):
        with self.assertRaisesRegex(RuntimeError, 'Cannot discover'):
            self.crawl({})
        with self.assertRaisesRegex(RuntimeError, 'requests'):
            self.crawl({'/v2': (200, {'data': ['a', 'b']})}, max_nodes=1)
        with self.assertRaisesRegex(RuntimeError, 'max-depth'):
            self.crawl({'/v2': (200, {'data': ['a']}), '/v2/a': (200, {'data': ['b']})}, max_depth=1)

    def test_redirects_are_not_followed(self):
        catalog, calls = self.crawl({'/v2': (200, {'data': ['redirect']}), '/v2/redirect': (302, {})})
        self.assertEqual(catalog['nodes']['/v2/redirect']['status'], 302)
        self.assertEqual(len(calls), 2)

    def test_invalid_api_origins_and_roots(self):
        for base in ['file:///tmp/api', 'https://user:password@example.com', 'https://example.com/path']:
            with self.assertRaises(ValueError): discover.Discovery(base)
        for root in ['//evil.test', '/v2/../other', '/v2?query']:
            with self.assertRaises(ValueError): discover.Discovery('https://example.com', root=root)
        with self.assertRaises(ValueError): discover.Discovery('http://example.com', auth='Basic secret')

if __name__ == '__main__':
    unittest.main()
