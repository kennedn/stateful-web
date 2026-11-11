Investigate and fix response-side CORS for https://api.kennedn.com.

Context
- The frontend is a static Hugo + plain JavaScript control panel in /home/kennedn/Projects/stateful-web-static. Do not use the neighbouring stateful-web or stateful-web-vue projects as references.
- API discovery starts at GET /v2. GET / returns 404. Arrays enumerate nested devices/commands, and some endpoints return data.codes.
- Internal network clients require no authentication. External clients require username/password (Basic authentication). Preserve this access policy.
- The user has CONFIRMED that POST /v2/meross/<device>?code=toggle from the browser actually changes the bulb, but JavaScript cannot read the response and reports CORS. Do not describe this as proof that the request failed or never reached the API.
- Frontend fetch uses an explicit method, credentials:'omit', redirect:'error', cache:'no-store'. Query-code POSTs have no body or Content-Type header. When signed in, it sends Authorization: Basic …; JSON requests use Content-Type: application/json. Read static/js/app.js for current code.
- Earlier curl GET /v2 with Origin:http://localhost:1313 returned 200 JSON with no Access-Control-Allow-Origin. OPTIONS /v2/meross/office with Origin:http://localhost:1313, Access-Control-Request-Method:POST and Access-Control-Request-Headers:authorization,content-type returned 200 with no Access-Control-Allow-* headers. Recheck current behavior; these are prior observations, not guaranteed current configuration.

Investigate
1. Establish the exact frontend origin (scheme, hostname, port) from browser DevTools; localhost and 127.0.0.1 are different origins. Inspect actual browser request/response headers, console messages, any OPTIONS, status and redirects. Record whether the POST is sent once.
2. Distinguish a simple/safelisted POST that is sent and executed before the browser blocks response access from a preflighted request (Authorization or application/json) that may be blocked before POST is sent. A successful curl is not a browser CORS test. Do not use mode:no-cors, opaque responses, browser security disabling, automatic retries, or assume all fetch TypeErrors are CORS.
3. Trace API application, reverse proxy/ingress and external authentication gateway. Find where CORS headers are omitted, overwritten or duplicated. Check actual POST responses as well as GET, OPTIONS, redirects, 401/403/404 and upstream 5xx. OPTIONS returning 200 alone is insufficient.
4. Implement one consistent CORS layer with an explicit allowlist of the real frontend origins. Return a single matching Access-Control-Allow-Origin and Vary:Origin on actual responses, including authentication/error paths. Preflight must permit supported methods and requested Authorization/Content-Type headers and complete without requiring authentication or executing a device action. Expose WWW-Authenticate/Allow only if useful. This client omits cookies, so do not enable credentialed-cookie CORS or use a wildcard by habit.
5. Preserve internal no-auth and external Basic-auth behavior. Check that Origin headers or a new LAN-originating proxy cannot bypass external authentication. Do not log credentials or place them in commands, screenshots or artifacts.
6. Prefer server/proxy CORS correction. A same-origin reverse proxy is an alternative, but requires explicit public-entry authentication because the upstream may see a trusted LAN client.

Verification
- Begin with GET/OPTIONS and mocked tests. Use a known read-only POST code=status for end-to-end response tests, if supported. Do not repeatedly toggle bulbs or other real devices for debugging; ask before any state-changing reproduction.
- Test browser fetch from each allowed origin: anonymous internal GET and status POST, Authorization-triggered preflight and authenticated response, JSON-triggered preflight, and readable authentication/errors. Test disallowed origins too.
- Confirm the browser can read status, JSON body and needed exposed headers. Confirm no duplicate commands/retries and unchanged authentication policy. curl with Origin helps inspect headers but does not enforce browser CORS.
- Produce the exact root cause, changed files/configuration, verification results, and any required reload/deploy steps. Clearly distinguish proven findings from hypotheses.

Deliver a minimal, reviewable fix in the API/proxy repository. Do not change frontend design or invent response success to hide CORS failures.
