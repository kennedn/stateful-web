# Kennedn’s device controls

A static Hugo site with a Python preprocessing step. Normal build and hosting need no Node, npm, frontend framework or backend application. Older Safari automatically loads checked-in ES5 application assets and locally bundled compatibility libraries; there are no runtime CDN dependencies.

## Run

Requires Hugo **0.158+**, Python **3.10+**, and optionally Make.

```sh
make build       # GET discovery, then Hugo → public/
make serve       # http://localhost:5173 (uses the saved discovery map)
```

Or without Make:

```sh
python3 scripts/discover.py
hugo --minify
hugo server --bind 127.0.0.1 --port 5173
```

Deploy `public/` to your static server. `hugo` alone rebuilds from `data/api.json`; `make build` refreshes discovery first and fails if discovery fails. The checked-in map records the actual API tree at build time. Rebuild to pick up added/removed devices. Device state is not included in the discovery artifact.

For installation under a subpath:

```sh
hugo --baseURL https://kennedn.com/control/ --minify
```

The Ubuntu font and logo were downloaded from your public personal site/blog and are served locally. Ubuntu Mono is bundled alongside its license. The layout follows the personal site and blog: teal background, solid teal/pink/purple tiles, white text and icons, Ubuntu typography, square edges and uniform tile sizes. Tile colours are muted variants of the blog’s teal/pink/purple, using its dark surface tint: `#1d7775`, `#c8225e`, `#66089b`. A small drop shadow separates every tile from the background.

## API discovery

The root is **https://api.kennedn.com/v2**, not `/` (which returns 404).

```sh
python3 scripts/discover.py --base-url https://api.kennedn.com --root /v2
python3 scripts/discover.py --help
```

Discovery follows `{"data": ["child", ...]}` arrays through arbitrary nesting, and understands `{"data": {"codes": [...]}}` command lists. A child that responds to GET becomes a node; an array entry returning 404 is treated as a candidate command on its parent. This inference is imperfect: an unavailable child can also return 404. The catalog labels the convention as inferred, and errors other than 404 remain visible as unavailable nodes rather than disappearing into the command list. Credentials, raw response metadata and device state are not saved.

Discovery only sends GET. It uses bounded concurrency, timeouts and request/depth limits. HTTP redirects are rejected. An auth error or exceeded limit fails the run and preserves the previous map. Repeated builds do not execute commands. All GET discovery routes must be free of side effects.

To preprocess from outside the internal network, supply `API_USERNAME` and `API_PASSWORD` as environment variables through your shell or CI secret store. They are sent as Basic authentication over HTTPS and never written to generated files.

The initial live map contains **63 nodes / 10 services**. `/v2/alert` returns **405** for GET. [API discovery gaps and suggested changes](docs/api-contract.md) explains what the current responses cannot tell us.

## Browser requests and authentication

Device tiles are the main interface. Each category uses a uniform height fitted to its tallest visible tile, with a common **240px minimum**. This applies to normal browsing, search and favourites; categories never force other categories to grow. Adjust `--tile-min-height` on `#device-grid` in `static/css/app.css` to change that minimum. Sizes are recalculated only on filtering, font loading and viewport changes; space for readings and two-line messages is reserved, so polling does not shift the buttons. Compact numeric controls fit within that height; long readings scroll inside their state area. Toggle, status, power and other discovered quick actions send directly from the tile. Service filters, search and pinned favourites keep a large tree manageable. On mobile, category filters and main controls use at least 44px touch targets, larger labels and input text, with enlarged slider thumbs. Favourites are saved locally; when any are pinned, a fresh page opens to Favourites. Numeric ranges have a slider/number input and explicit **Apply** button, so dragging does not send commands. Device names remain unique within their service groups.

The **⋯** button beside each favourite star opens the extended device panel in that tile’s colour. Tile backgrounds, icons and names do not open it. Tiles have no fixed corner decorations or hover scaling. A white border trail animates around devices confirmed on; stale/offline readings suppress it, and reduced-motion settings use a static border. Icons do not glow, and bulbs do not show brightness readings. Commands needing undocumented arguments (for example colour, brightness and temperature) open the custom request editor rather than inventing a parameter schema. The full API tree and arbitrary method/path/query/JSON/header editor are retained in the collapsed **Custom request & API tree** section, along with response details and cURL copying.

A quick action sends `POST /endpoint?code=…` once. For a device advertising `status`, a mutation then schedules status-only follow-ups at about **0.1, 0.25, 0.5, 0.85, 1.3, 1.9, 2.7, 3.7, 4.9, 6.3, 7.9 and 9.5 seconds**, with a **hard 10-second budget**, including queue time and in-flight reads. Slow reads are aborted at the deadline. Follow-ups stop early when a fresh status confirms an inferable target (such as a power toggle or numeric value). If no target can be inferred, the updating indicator clears after the first recognised status, while background checks continue to catch delayed changes. New actions/manual refreshes supersede older work for that tile; sign-out and page exit cancel background work. Authentication denials stop follow-ups. The action itself is never replayed, including when its response was unreadable. Snowdon’s quick buttons are **Power, Input, Status**. Readable status updates power indicators and toggle labels, current/target heating temperatures and Heating/Idle badges, sensor temperature/humidity/battery readings, and numeric control values. Raw JSON is retained only in response details. Unrecognised fields are not dumped onto tiles, and sent commands never fabricate device state. After an unreadable response, any earlier state is labelled Last known. Successful connection checks are silent; only connection errors are shown. A blocked or failed response shows **“No readable response · action may have run”**; no success/state is fabricated and no command is retried. **Inspect GET** in the advanced section sends a discovery GET. The initial connection check sends only a root GET and describes whether responses are readable, rather than claiming a failed check proves commands cannot execute.

Internal access tries without authentication. A readable 401 opens the sign-in dialog. You can also open it manually. Username/password are used for HTTPS Basic authentication. Successful sign-in is saved in **sessionStorage** by default, so it survives reloads in the same tab. Select **Remember sign-in on this device** to save it in **localStorage** across browser restarts. Saved sign-ins are scoped to the configured API origin. **Clear credentials** removes both copies; a readable 401 also discards rejected saved credentials. Basic authorization is reversible encoding, not encryption at rest, so remember it only on trusted devices. If storage is unavailable, the panel reports that sign-in will last only until reload. cURL copies omit session credentials. A timed-out or cancelled write might still have executed on the API; the UI reports that uncertainty and uses only status reads to check for subsequent state changes.

### Refreshing multiple devices

The **↻ icon beside Device controls** refreshes all status-capable devices, regardless of the current filter. Each **category’s ↻ icon** refreshes that category’s visible tiles, respecting search/favourites filters. Both use a snapshot of their targets when clicked. Devices without a status command are excluded. Background reads use at most three concurrent jobs and show completion/error/skipped counts. **Cancel refresh** aborts queued and active work. Changing the filter does not silently change the scope of a running batch. Acting on a device supersedes a queued/active refresh for that device, and older responses cannot overwrite the newer action’s state.

Radiator status refreshes also request `code=battery`. That response is a separate `data: [{id, value}]` array, where `value` is battery percentage. Battery readings merge into existing temperature/power state, and normal status readings preserve them. Multi-radiator responses retain individual IDs; values outside 0–100 are ignored.

### Current deployment blocker: CORS

The API currently returns neither `Access-Control-Allow-Origin` on GET nor CORS permission headers on OPTIONS. A browser on another origin cannot read the API’s responses, even though Python/curl on the internal network can. The user has confirmed that a query-code POST can still actuate a Meross bulb before response access is blocked. Simple POSTs can be sent without a preflight; CORS then controls whether JavaScript may read the response. Requests with Authorization or application/json normally need a preflight, so a missing preflight permission can prevent those POSTs from being sent. Authentication errors need CORS headers as well, or the browser cannot read a 401 and trigger sign-in.

Use either:

1. **Same-origin reverse proxy (recommended for your own hosting).** Serve the static files and proxy `/v2` to the API on the same host. Set `apiBaseURL = ''` in `[params]` in `hugo.toml`, then rebuild. Browser requests go to the hosting origin. See [the Nginx example](docs/nginx.conf). The proxy is infrastructure, not a runtime dependency of Hugo.
2. **Direct cross-origin API calls.** Leave `apiBaseURL = 'https://api.kennedn.com'`, and configure the API/proxy with the CORS behavior in [the API contract notes](docs/api-contract.md).

**Authentication must remain enforced at the public entry point.** A reverse proxy originating from the internal network might otherwise bypass the API’s external authentication. The sample deliberately leaves the site's existing access control to your hosting configuration. Do not expose an unprotected proxy to the internet.

The map itself contains device names and available commands; host it on the same protected/internal site if those should remain private.

## Validation

```sh
make test
hugo --minify
```

The Python tests use a local HTTP fixture to exercise nested discovery, command codes, numeric values, auth failures, HTTP failures, limits, redirect rejection and origin validation without contacting your devices.

An optional browser smoke test uses an existing modern Chrome/Chromium installation and Python's `websocket-client` package; neither is required to build or serve the site:

```sh
python3 tests/browser_smoke.py
python3 tests/browser_smoke.py --legacy
```

It serves the generated output locally and substitutes API responses. Checks cover uniform category sizes, independent category heights in mixed search/favourite results, and content fit, animated state borders, global/category bulk requests and concurrency/cancellation, battery/status merging, the actual backoff timing and ten-second cancellation deadline, superseded polling, one-click actions without write retries, Snowdon shortcuts, device visuals, authentication, and desktop/mobile layout. It does not send commands to the real API.

## Separate API-side investigation

[Prompt for another AI agent](docs/cors-investigation-prompt.md): reproduce and correct the response-side CORS behavior in the API/proxy, preserving internal/external authentication. This frontend change does not alter the API or bypass browser CORS.

## iOS 8 / Safari 8 compatibility

Older browsers automatically receive the compatibility path. Use `?legacy=1` to force it in a newer browser for inspection. Both paths use the same application source, discovery map, authentication behavior and controls.

- ES5 syntax throughout the legacy bootloader, application bundle and vendor scripts, checked with Acorn during regeneration.
- Bundled standard-library support from [core-js 3.26.1](https://github.com/zloirock/core-js/tree/v3.26.1) and an abortable XMLHttpRequest transport from [whatwg-fetch 3.6.20](https://github.com/JakeChampion/fetch). Their MIT licenses are shipped in `static/js/vendor/`.
- DOM, UTF-8 encoding, cancellation, validation and modal-dialog fallbacks. Dialogs support stacking, Escape/Tab handling, scroll locking and focus restoration.
- Literal-colour CSS and prefixed Flexbox layouts replace CSS variables, Grid and flex gap. Category sizing, readable mobile controls and the tile’s panel colour are retained. An SVG border animation replaces the conic-gradient border on older browsers, using the animation speed and border width from the main CSS when generated.
- Copy opens a selectable-text panel when programmatic clipboard access is unavailable; touch and hold to use the browser’s Copy menu.

The XHR transport cannot reliably implement fetch’s `redirect: 'error'` policy. Serve API routes directly without redirects; the API-origin restriction remains in the request builder. CORS behavior remains controlled by the browser/API. Private-browsing storage failures are handled without preventing sign-in; the panel reports when credentials cannot survive reload.

### Maintaining the compatibility assets

Generated files are committed. `hugo`, `make build`, `make serve` and `make test` work without Node/npm when those files match their sources. Builds verify source/output hashes and fail clearly if regeneration is needed.

Only when modifying JavaScript, CSS or compatibility source files, regenerate with the optional tools:

```sh
npm install --prefix scripts/legacy
node scripts/legacy/build.cjs
hugo --minify
```

This is an asset maintenance step, not a frontend runtime or a replacement for Hugo. The build also accepts the corresponding system-installed Babel/PostCSS/Acorn packages.

The legacy browser test removes modern APIs and exercises the ES5/XHR/layout/dialog path with simulated API responses, including status polling and cancellation. It validates behavior under compatibility fallbacks; **it is not a real iOS 8 device or WebKit 600 test**. Final on-device verification is still needed before claiming full platform certification. [Apple’s archived Safari CSS reference](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariCSSRef/Articles/StandardCSSProperties.html) documents the older rendering baseline.
