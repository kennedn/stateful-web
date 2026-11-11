/* Static discovery catalog + live, user-initiated API calls. No dependencies. */
'use strict';
(() => {
  const $ = (id) => document.getElementById(id);
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  let catalog, selected, credentials = null, controller = null, responseText = '';
  const expanded = new Set();
  const colors = ['#1c817e', '#dd2164', '#6e04a9'];
  const configuredBase = document.body.dataset.apiBase;
  const apiBase = configuredBase === '' ? location.origin : configuredBase.replace(/\/$/, '');
  const authStorageKey = 'kennedn-api-auth-v1:' + new URL(apiBase).origin;
  let credentialUsername = '';

  function clearSavedAuth() {
    let cleared = true;
    for (const type of ['localStorage', 'sessionStorage']) {
      try { window[type].removeItem(authStorageKey); } catch { cleared = false; }
    }
    return cleared;
  }

  function forgetAuth() {
    credentials = null; credentialUsername = '';
    $('remember-auth').checked = false;
    $('auth-button').textContent = 'Sign in';
    return clearSavedAuth();
  }

  function restoreAuth() {
    for (const type of ['localStorage', 'sessionStorage']) {
      try {
        const raw = window[type].getItem(authStorageKey);
        if (!raw) continue;
        const saved = JSON.parse(raw);
        if (typeof saved.username !== 'string' || typeof saved.authorization !== 'string' || !/^Basic [A-Za-z0-9+/]+={0,2}$/.test(saved.authorization)) {
          window[type].removeItem(authStorageKey); continue;
        }
        credentials = saved.authorization; credentialUsername = saved.username;
        $('username').value = saved.username;
        $('remember-auth').checked = type === 'localStorage';
        $('auth-button').textContent = 'Account';
        return;
      } catch { /* Unavailable or invalid browser storage does not stop the panel. */ }
    }
  }

  function saveAuth(username, authorization, remember) {
    const target = remember ? 'localStorage' : 'sessionStorage';
    const other = remember ? 'sessionStorage' : 'localStorage';
    try {
      window[other].removeItem(authStorageKey);
      window[target].setItem(authStorageKey, JSON.stringify({username, authorization}));
      return true;
    } catch { return false; }
  }
  restoreAuth();


  function apiURL(path) {
    if (!path.startsWith('/') || path.startsWith('//') || /[\\#\s]/.test(path)) {
      throw new Error('Enter an absolute API path, such as /v2/meross/office. Encode spaces and omit fragments.');
    }
    const origin = new URL(apiBase).origin;
    const url = new URL(path, origin);
    if (url.origin !== origin || url.username || url.password) throw new Error('Requests must stay on the configured API origin.');
    return url;
  }

  function basicAuth(username, password) {
    if (username.includes(':')) throw new Error('A Basic authentication username cannot contain a colon.');
    return 'Basic ' + btoa(Array.from(new TextEncoder().encode(username + ':' + password), (byte) => String.fromCharCode(byte)).join(''));
  }

  async function apiFetch(url, options = {}, auth = credentials) {
    const headers = new Headers(options.headers);
    if (headers.has('Authorization')) throw new Error('Use Sign in to set the Authorization header.');
    if (auth) {
      if (new URL(url).protocol !== 'https:') throw new Error('Sign in requires an HTTPS API connection.');
      headers.set('Authorization', auth);
    }
    const response = await fetch(url, { ...options, headers, credentials: 'omit', redirect: 'error', cache: 'no-store' });
    if (response.status === 401 && auth && auth === credentials) forgetAuth();
    return response;
  }

  function networkMessage(error) {
    if (error.name === 'AbortError') return 'Request cancelled or timed out. A sent command may still have executed on the device.';
    if (error instanceof TypeError) return 'No readable response. The command may already have executed; CORS can block the response after a POST is sent. Check the browser console to distinguish CORS from a network failure. Do not retry a toggle just to get a response.';
    return error.message;
  }

  function openAuth() {
    $('auth-error').hidden = true;
    if (!$('auth-dialog').open) $('auth-dialog').showModal();
  }

  function connectionError(message = '') {
    $('connection-strip').hidden = !message;
    $('connection').textContent = message;
  }

  async function checkConnection() {
    connectionError();
    $('notice').hidden = true;
    try {
      const response = await apiFetch(apiURL(catalog.root), { signal: AbortSignal.timeout(12000) });
      if (response.status === 401) {
        connectionError('Sign in required');
        openAuth();
      } else if (!response.ok) {
        throw new Error('API returned HTTP ' + response.status + '.');
      } else {
        connectionError();
      }
    } catch (error) {
      connectionError('Responses unavailable');
      $('notice').textContent = error instanceof TypeError ? 'The browser cannot read API responses. Quick actions may still execute. Until responses are fixed, device state cannot be confirmed here.' : networkMessage(error);
      $('notice').hidden = false;
    }
  }

  function title(name) {
    return name.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (letter) => letter.toUpperCase());
  }

  function treeEntry(path) {
    const node = catalog.nodes[path];
    const group = el('div');
    const row = el('div', 'tree-row');
    const toggle = el('button', 'tree-toggle', node.children.length ? (expanded.has(path) ? '▾' : '▸') : '·');
    toggle.type = 'button';
    if (node.children.length) {
      toggle.setAttribute('aria-label', (expanded.has(path) ? 'Collapse ' : 'Expand ') + node.name);
      toggle.setAttribute('aria-expanded', String(expanded.has(path)));
      toggle.addEventListener('click', () => {
        if (expanded.has(path)) expanded.delete(path); else expanded.add(path);
        renderTree();
      });
    } else {
      toggle.disabled = true;
      toggle.setAttribute('aria-hidden', 'true');
      toggle.tabIndex = -1;
    }
    const button = el('button', 'tree-link' + (selected === path ? ' active' : ''));
    button.type = 'button';
    if (selected === path) button.setAttribute('aria-current', 'page');
    button.append(el('span', '', node.children.length ? '▧' : '◇'), el('span', '', node.name));
    button.addEventListener('click', () => navigate(path));
    row.append(toggle, button);
    group.append(row);
    if (expanded.has(path)) {
      const children = el('div', 'tree-child');
      for (const child of node.children) children.append(treeEntry(child));
      group.append(children);
    }
    return group;
  }

  function renderTree() {
    $('tree').replaceChildren();
    const search = $('search').value.trim().toLowerCase();
    if (search) {
      let count = 0;
      for (const node of Object.values(catalog.nodes)) {
        const commandMatches = node.commands.filter((command) => command.toLowerCase().includes(search));
        if (!node.path.toLowerCase().includes(search) && !commandMatches.length) continue;
        const button = el('button', 'tree-search-result', title(node.name));
        button.type = 'button';
        button.append(el('small', '', node.path));
        if (commandMatches.length) button.append(el('small', '', 'Commands: ' + commandMatches.slice(0, 4).join(', ')));
        button.addEventListener('click', () => navigate(node.path));
        $('tree').append(button);
        count++;
      }
      if (!count) $('tree').append(el('p', 'help', 'No devices or commands match your search.'));
      return;
    }
    $('tree').append(treeEntry(catalog.root));
  }

  function navigate(path, push = true) {
    if (!catalog.nodes[path]) path = catalog.root;
    selected = path;
    let ancestor = path;
    while (ancestor.startsWith(catalog.root)) {
      expanded.add(ancestor);
      ancestor = ancestor.slice(0, ancestor.lastIndexOf('/'));
    }
    if (push) location.hash = path;
    renderTree();
    renderNode();
  }

  function prepareCommand(code) {
    $('method').value = 'POST';
    $('request-path').value = selected;
    $('code').value = code;
    $('query').value = '';
    $('body').value = '';
    $('headers').value = '';
    updatePreview();
  }

  function renderCommands(node) {
    const container = $('commands');
    container.replaceChildren();
    const numbers = node.commands.filter((code) => /^(0|[1-9]\d*)$/.test(code)).map(Number).sort((a, b) => a - b);
    const isRange = numbers.length >= 10 && numbers.every((n, index) => n === numbers[0] + index);
    if (isRange) {
      const label = el('label', 'range-control', 'Code ' + numbers[0] + '–' + numbers.at(-1));
      const range = el('input');
      range.type = 'range'; range.min = numbers[0]; range.max = numbers.at(-1); range.step = 1; range.value = numbers[0];
      range.setAttribute('aria-label', 'Command code slider');
      const numeric = el('input');
      numeric.type = 'number'; numeric.min = range.min; numeric.max = range.max; numeric.step = 1; numeric.value = range.value;
      numeric.setAttribute('aria-label', 'Numeric command code');
      range.addEventListener('input', () => { numeric.value = range.value; prepareCommand(range.value); });
      numeric.addEventListener('input', () => {
        if (numeric.value !== '' && numeric.checkValidity()) { range.value = numeric.value; prepareCommand(numeric.value); }
      });
      const use = el('button', 'outline', 'Use code');
      use.type = 'button';
      use.addEventListener('click', () => { if (numeric.reportValidity() && numeric.value !== '') prepareCommand(numeric.value); });
      label.append(range, numeric, use);
      container.append(label);
    }
    for (const code of node.commands) {
      if (isRange && /^(0|[1-9]\d*)$/.test(code)) continue;
      const button = el('button', 'command', code);
      button.type = 'button'; button.dataset.code = code; button.setAttribute('aria-pressed', 'false');
      button.addEventListener('click', () => prepareCommand(code));
      container.append(button);
    }
  }

  function renderNode() {
    const node = catalog.nodes[selected];
    $('breadcrumbs').replaceChildren();
    const segments = selected.split('/').filter(Boolean);
    segments.forEach((segment, index) => {
      if (index) $('breadcrumbs').append(el('span', '', '/'));
      const path = '/' + segments.slice(0, index + 1).join('/');
      if (catalog.nodes[path]) {
        const button = el('button', '', decodeURIComponent(segment));
        button.type = 'button'; button.addEventListener('click', () => navigate(path));
        $('breadcrumbs').append(button);
      } else $('breadcrumbs').append(el('span', '', segment));
    });
    $('node-kind').textContent = selected === catalog.root ? 'API ROOT' : node.children.length ? 'BRANCH / ' + node.children.length + ' ENDPOINTS' : 'ENDPOINT / ' + node.commands.length + ' COMMANDS';
    $('node-title').textContent = selected === catalog.root ? 'Available services' : title(node.name);
    $('node-path').textContent = selected;
    $('node-warning').hidden = !node.error;
    $('node-warning').textContent = node.error ? 'Discovery incomplete: ' + node.error + '. Use the request builder if you know the calling convention.' : '';
    $('branches').replaceChildren();
    node.children.forEach((path, index) => {
      const child = catalog.nodes[path];
      const button = el('button', 'branch'); button.type = 'button';
      button.style.setProperty('--tile', colors[index % colors.length]);
      button.append(el('span', 'branch-icon', child.children.length ? '▧' : '◇'), el('span', 'branch-name', title(child.name)), el('small', '', child.error ? 'Discovery unavailable' : child.children.length ? child.children.length + ' endpoints' : child.commands.length + (child.commands.length === 1 ? ' command' : ' commands')), el('span', 'branch-arrow', '↗'));
      button.addEventListener('click', () => navigate(path));
      $('branches').append(button);
    });
    $('commands-section').hidden = !node.commands.length;
    $('command-count').textContent = node.commands.length;
    renderCommands(node);
    $('convention').textContent = node.commands.length ? 'Commands use the POST ?code=… convention. GET does not declare methods or argument schemas; add any required parameters below.' : 'Edit the method, API path, query parameters and optional body to make an arbitrary call.';
    $('method').value = 'GET'; $('request-path').value = selected;
    $('code').value = ''; $('query').value = ''; $('body').value = ''; $('headers').value = '';
    $('validation').hidden = true;
    updatePreview();
  }

  function getRequest() {
    const method = $('method').value;
    const url = apiURL($('request-path').value.trim());
    for (const [key, value] of new URLSearchParams($('query').value.replace(/^\?/, ''))) url.searchParams.append(key, value);
    if ($('code').value !== '') url.searchParams.set('code', $('code').value);
    let headers = {};
    if ($('headers').value.trim()) {
      headers = JSON.parse($('headers').value);
      if (!headers || Array.isArray(headers) || typeof headers !== 'object' || Object.values(headers).some((value) => typeof value !== 'string')) throw new Error('Additional headers must be a JSON object with string values.');
    }
    const requestHeaders = new Headers(headers);
    if (requestHeaders.has('Authorization')) throw new Error('Use Sign in to set the Authorization header.');
    const body = $('body').value.trim();
    if (body) {
      if (method === 'GET' || method === 'HEAD') throw new Error(method + ' requests cannot contain a body.');
      JSON.parse(body);
      if (!requestHeaders.has('Content-Type')) requestHeaders.set('Content-Type', 'application/json');
    }
    return { url, options: { method, headers: requestHeaders, ...(body ? { body } : {}) } };
  }

  function updatePreview() {
    for (const button of $('commands').querySelectorAll('[data-code]')) {
      const active = button.dataset.code === $('code').value && $('method').value === 'POST';
      button.classList.toggle('selected', active); button.setAttribute('aria-pressed', String(active));
    }
    try {
      const { url, options } = getRequest();
      $('request-preview').textContent = options.method + ' ' + url.pathname + url.search;
    } catch { $('request-preview').textContent = 'Complete the request fields to preview.'; }
  }

  async function sendRequest(request) {
    if (controller) return;
    const node = catalog?.nodes[request.url.pathname];
    let code = request.url.searchParams.get('code');
    if (!code && request.options.body) { try { code = JSON.parse(request.options.body).code; } catch {} }
    const context = node && !['GET', 'HEAD', 'OPTIONS'].includes(request.options.method) ? beginDeviceOperation(node, String(code || '')) : null;
    if (context) foregroundDevices.add(node.path);
    let result;
    $('validation').hidden = true;
    controller = new AbortController();
    const requestController = controller;
    const timer = setTimeout(() => requestController.abort(), 30000);
    $('send').disabled = true; $('cancel').hidden = false;
    document.querySelectorAll('.quick-action').forEach((button) => { button.disabled = true; });
    $('response-meta').textContent = 'Sending…';
    $('response-request').textContent = request.options.method + ' ' + request.url.href;
    $('response-request').hidden = false;
    const start = performance.now();
    try {
      const response = await apiFetch(request.url, {...request.options, signal: requestController.signal});
      responseText = await response.text();
      let formatted = responseText || '(empty response)';
      try { formatted = JSON.stringify(JSON.parse(responseText), null, 2); } catch {}
      $('response').textContent = formatted;
      $('response-meta').textContent = response.status + ' ' + response.statusText + ' · ' + Math.round(performance.now() - start) + ' ms';
      $('response-headers').textContent = Array.from(response.headers, ([key, value]) => key + ': ' + value).join('\n');
      $('response-header-details').hidden = false;
      if (response.status === 401) { connectionError('Sign in required'); openAuth(); }
      if (response.ok) { connectionError(); $('notice').hidden = true; }
      result = {ok: response.ok, status: response.status, body: formatted};
    } catch (error) {
      responseText = networkMessage(error);
      $('response').textContent = responseText;
      $('response-meta').textContent = 'Response unavailable · result unconfirmed';
      $('response-header-details').hidden = true;
      result = {ok: false, status: 0, body: responseText};
    } finally {
      clearTimeout(timer); controller = null; $('send').disabled = false; $('cancel').hidden = true;
      document.querySelectorAll('.quick-action').forEach((button) => { button.disabled = false; });
      if (context) foregroundDevices.delete(node.path);
    }
    if (context && deviceVersions.get(node.path) === context.version) {
      acceptDeviceResult(node, context.code, result);
      if (context.mutation && ![401, 403].includes(result.status) && node.commands.includes('status')) {
        pendingStatusChecks.add(node.path);
        void statusPoller.start(node.path, async (options) => {
          const reading = await readDevice(node, {...options, version: context.version});
          const known = reading?.ok && reading.model?.known;
          const confirmed = known && (!context.expected || Object.entries(context.expected).every(([key, value]) => reading.model[key] === value));
          if (confirmed && deviceVersions.get(node.path) === context.version) {
            pendingStatusChecks.delete(node.path);
            renderDeviceFeedback(node);
          }
          // With no inferable target, keep quiet background checks for delayed updates.
          return {...reading, settled: !!context.expected && confirmed};
        }).then(() => {
          if (deviceVersions.get(node.path) === context.version) pendingStatusChecks.delete(node.path);
          renderDeviceFeedback(node);
        });
        renderDeviceFeedback(node);
      } else if (context.code === 'status' && result.ok && node.commands.includes('battery')) {
        void readDevice(node, {code: 'battery', version: context.version});
      }
    }
    return result;
  }

  async function copy(text, button) {
    const original = button.textContent;
    try { await navigator.clipboard.writeText(text); button.textContent = 'Copied'; }
    catch { button.textContent = 'Copy unavailable'; }
    setTimeout(() => { button.textContent = original; }, 1600);
  }
  const shellQuote = (value) => "'" + value.replace(/'/g, "'\\''") + "'";

  $('search').addEventListener('input', () => { if (catalog) renderTree(); });
  for (const id of ['method', 'request-path', 'code', 'query', 'body', 'headers']) $(id).addEventListener('input', updatePreview);
  $('request-form').addEventListener('submit', (event) => {
    event.preventDefault();
    try { void sendRequest(getRequest()); }
    catch (error) { $('validation').textContent = error.message; $('validation').hidden = false; }
  });
  $('cancel').addEventListener('click', () => controller?.abort());
  $('inspect').addEventListener('click', () => {
    if (controller) return;
    $('method').value = 'GET'; $('request-path').value = selected; $('code').value = ''; $('query').value = ''; $('body').value = ''; $('headers').value = '';
    updatePreview(); void sendRequest(getRequest());
  });
  $('reconnect').addEventListener('click', () => { if (catalog) void checkConnection(); });
  $('auth-button').addEventListener('click', openAuth);
  $('auth-close').addEventListener('click', () => { $('password').value = ''; $('auth-dialog').close(); });
  $('auth-dialog').addEventListener('cancel', () => { $('password').value = ''; });
  $('sign-out').addEventListener('click', () => {
    cancelStatusWork();
    const cleared = forgetAuth();
    $('username').value = ''; $('password').value = '';
    $('auth-dialog').close();
    if (catalog) void checkConnection().then(() => {
      if (!cleared) { $('notice').textContent = 'Browser storage could not be cleared. Remove this site’s saved data in your browser settings.'; $('notice').hidden = false; }
    });
  });
  $('remember-auth').addEventListener('change', () => {
    if (!credentials) return;
    const saved = saveAuth(credentialUsername, credentials, $('remember-auth').checked);
    $('auth-error').hidden = saved;
    if (!saved) $('auth-error').textContent = 'Browser storage is unavailable. The remember setting could not be saved.';
  });
  $('auth-form').addEventListener('submit', async (event) => {
    event.preventDefault(); $('auth-error').hidden = true; $('login').disabled = true;
    try {
      const candidate = basicAuth($('username').value, $('password').value);
      const response = await apiFetch(apiURL(catalog.root), { signal: AbortSignal.timeout(12000) }, candidate);
      if (!response.ok) throw new Error(response.status === 401 ? 'Username or password was rejected.' : 'API returned HTTP ' + response.status + '.');
      const saved = saveAuth($('username').value, candidate, $('remember-auth').checked);
      credentials = candidate; credentialUsername = $('username').value; $('password').value = ''; $('auth-button').textContent = 'Account'; $('auth-dialog').close();
      connectionError(); $('notice').hidden = saved;
      if (!saved) $('notice').textContent = 'Connected, but browser storage is unavailable. This sign-in will be lost when the page reloads.';
    } catch (error) { $('auth-error').textContent = networkMessage(error); $('auth-error').hidden = false; }
    finally { $('login').disabled = false; }
  });
  $('copy-request').addEventListener('click', () => {
    try {
      const { url, options } = getRequest();
      let command = 'curl -X ' + options.method + ' ' + shellQuote(url.href);
      for (const [key, value] of options.headers) command += ' -H ' + shellQuote(key + ': ' + value);
      if (options.body) command += ' --data-raw ' + shellQuote(options.body);
      // Never include session credentials in the clipboard.
      void copy(command, $('copy-request'));
    } catch (error) { $('validation').textContent = error.message; $('validation').hidden = false; }
  });
  $('copy-response').addEventListener('click', () => { void copy(responseText, $('copy-response')); });
  window.addEventListener('hashchange', () => { if (catalog && location.hash.slice(1) !== selected) navigate(location.hash.slice(1), false); });

  // Device controls are built from the discovery map; browsing does not make API calls.
  let activeService = 'all', activeDevice = null;
  let favorites = new Set();
  try { favorites = new Set(JSON.parse(localStorage.getItem('kennedn-control-favorites') || '[]')); } catch { /* Storage is optional. */ }
  if (favorites.size) activeService = 'favorites';
  const deviceResults = new Map();
  const deviceStates = new Map();
  const deviceColors = new Map();
  const serviceNames = {meross: 'Lights & plugs', thermostat: 'Thermostat', radiator: 'Radiators', snowdon: 'Soundbar', tvcom: 'Television', wol: 'Computers', hikvision: 'Cameras', bthome: 'Sensors', bins: 'Bins', alert: 'Alerts'};
  const serviceOrder = ['meross', 'thermostat', 'radiator', 'snowdon', 'tvcom', 'wol', 'hikvision', 'bthome', 'bins', 'alert'];
  const needsArguments = new Set(['rgb', 'fade', 'heatTemp', 'adjust', 'boost', 'schedule', 'temperature', 'luminance', 'mode']);
  const actionLabels = {toggle: 'Toggle', status: 'Status', power: 'Power', on: 'On', off: 'Off', heatTemp: 'Heat temperature', luminance: 'Brightness', rgb: 'Colour', play_pause: 'Play / pause', volume_up: 'Volume +', volume_down: 'Volume −', bass_up: 'Bass +', bass_down: 'Bass −', treble_up: 'Treble +', treble_down: 'Treble −'};
  const serviceOf = (node) => node.path.slice(catalog.root.length + 1).split('/')[0];
  const deviceNodes = () => Object.values(catalog.nodes).filter((node) => node.commands.length && !node.error);
  const labelAction = (code) => actionLabels[code] || title(code);

  const statusQueue = new window.StatusUpdates.Queue(3);
  const statusPoller = new window.StatusUpdates.Poller();
  const deviceVersions = new Map();
  const pendingStatusChecks = new Set();
  const foregroundDevices = new Set();
  let bulkController = null;

  function beginDeviceOperation(node, code) {
    statusPoller.cancel(node.path);
    pendingStatusChecks.delete(node.path);
    statusQueue.cancel(node.path);
    const version = (deviceVersions.get(node.path) || 0) + 1;
    deviceVersions.set(node.path, version);
    const previous = deviceStates.get(node.path);
    return {code, version, mutation: !['status', 'battery'].includes(code), expected: expectedState(node, code, previous?.stale ? null : previous?.model)};
  }

  function expectedState(node, code, before) {
    if (['on', 'off'].includes(code)) return {power: code};
    if (serviceOf(node) === 'wol' && code === 'power') return {power: 'on'};
    if ((code === 'toggle' || (serviceOf(node) === 'snowdon' && code === 'power')) && before?.power) {
      return {power: before.power === 'on' ? 'off' : 'on'};
    }
    if (serviceOf(node) === 'tvcom') {
      if (numericRange(node) && /^\d+$/.test(code)) return {value: Number(code)};
      if (node.commands.includes(code) && !['status', 'battery'].includes(code)) return {selection: code};
    }
    return null;
  }

  function acceptDeviceResult(node, code, result) {
    let model;
    if (result.ok) {
      try { model = window.DeviceStatus.parse(serviceOf(node), node, JSON.parse(result.body), code); } catch {}
      if (model?.known) {
        const merged = window.DeviceStatus.merge(deviceStates.get(node.path)?.model, model);
        deviceStates.set(node.path, {model: merged, stale: model.partial === 'battery' ? (deviceStates.get(node.path)?.stale || false) : false});
      } else if (!['status', 'battery'].includes(code) && deviceStates.has(node.path)) deviceStates.get(node.path).stale = true;
    } else if (deviceStates.has(node.path)) deviceStates.get(node.path).stale = true;
    const label = result.ok ? (['status', 'battery'].includes(code) ? (model?.known ? '' : labelAction(code) + ' received · details in panel.') : labelAction(code) + ' · response received')
      : result.status === 401 ? 'Sign in required · then refresh status.' : result.status ? 'API returned HTTP ' + result.status : (['status', 'battery'].includes(code) ? 'No readable response · state unconfirmed.' : 'No readable response · action may have run.');
    deviceResults.set(node.path, {kind: result.ok ? 'success' : result.status ? 'error' : 'unconfirmed', label, body: result.body});
    renderDeviceFeedback(node);
    return model;
  }

  async function readDevice(node, {code = 'status', version = deviceVersions.get(node.path) || 0, signal, deadline = Infinity, includeBattery = false} = {}) {
    try {
      return await statusQueue.run(node.path, async (jobSignal) => {
        if (foregroundDevices.has(node.path) || (deviceVersions.get(node.path) || 0) !== version) return {skipped: true};
        let last;
        for (const command of [code, ...(includeBattery && code === 'status' && node.commands.includes('battery') ? ['battery'] : [])]) {
          if (jobSignal.aborted || performance.now() >= deadline) throw new DOMException('Cancelled', 'AbortError');
          const readController = new AbortController();
          const abort = () => readController.abort();
          jobSignal.addEventListener('abort', abort, {once: true});
          const timeout = setTimeout(abort, Math.max(1, Math.min(2500, deadline - performance.now())));
          try {
            const url = apiURL(node.path); url.searchParams.set('code', command);
            const response = await apiFetch(url, {method: 'POST', signal: readController.signal});
            const raw = await response.text();
            let body = raw || '(empty response)';
            try { body = JSON.stringify(JSON.parse(raw), null, 2); } catch {}
            if (jobSignal.aborted || (deviceVersions.get(node.path) || 0) !== version) throw new DOMException('Superseded', 'AbortError');
            last = {ok: response.ok, status: response.status, body};
            if (!jobSignal.aborted && (deviceVersions.get(node.path) || 0) === version) last.model = acceptDeviceResult(node, command, last);
            if ([401, 403].includes(last.status)) {
              connectionError(last.status === 401 ? 'Sign in required' : 'Access denied');
              bulkController?.abort();
              if (last.status === 401) openAuth();
              return last;
            }
            if (!response.ok) return last;
          } catch (error) {
            if (jobSignal.aborted) throw error;
            last = {ok: false, status: 0, body: error.name === 'AbortError' ? 'Status read timed out. Previous readings are unconfirmed.' : 'Status response unavailable. Check the network and CORS; previous readings are unconfirmed.'};
            if ((deviceVersions.get(node.path) || 0) === version) acceptDeviceResult(node, command, last);
            return last;
          } finally { clearTimeout(timeout); jobSignal.removeEventListener('abort', abort); }
        }
        return last;
      }, {signal, deadline});
    } catch (error) {
      if (error.name === 'AbortError') return {skipped: true};
      throw error;
    }
  }

  async function refreshDevices(nodes) {
    if (bulkController) return;
    const targets = nodes.filter((node) => node.commands.includes('status'));
    if (!targets.length) return;
    const batch = new AbortController(); bulkController = batch;
    let completed = 0, failed = 0, skipped = 0;
    const progress = () => { $('bulk-progress').textContent = `${completed}/${targets.length} refreshed${failed ? ' · ' + failed + ' failed' : ''}${skipped ? ' · ' + skipped + ' skipped' : ''}`; };
    $('bulk-toolbar').hidden = false;
    $('cancel-refresh').hidden = false;
    document.querySelectorAll('.refresh-category, #refresh-all').forEach((button) => { button.disabled = true; });
    progress();
    try {
      await Promise.all(targets.map(async (node) => {
        statusPoller.cancel(node.path);
        pendingStatusChecks.delete(node.path);
        const result = await readDevice(node, {signal: batch.signal, includeBattery: true});
        if (result?.skipped) skipped++; else if (result?.ok) completed++; else failed++;
        progress(); renderDeviceFeedback(node);
      }));
    } finally {
      if (batch.signal.aborted) $('bulk-progress').textContent += ' · stopped';
      bulkController = null; $('cancel-refresh').hidden = true;
      document.querySelectorAll('.refresh-category').forEach((button) => { button.disabled = false; });
      $('refresh-all').disabled = !deviceNodes().some((node) => node.commands.includes('status'));
    }
  }

  function cancelStatusWork() {
    bulkController?.abort(); statusPoller.cancelAll(); pendingStatusChecks.clear(); statusQueue.cancelAll();
    for (const [path, version] of deviceVersions) deviceVersions.set(path, version + 1);
    controller?.abort();
  }

  function deviceIcon(service) {
    const paths = {
      meross: ['M9 18h6M10 21h4M8.5 14.5a6 6 0 1 1 7 0C14.5 15.3 15 17 15 18H9c0-1 .5-2.7-.5-3.5Z'],
      radiator: ['M5 7v12M9 7v12M13 7v12M17 7v12M3 9h16M3 17h16M19 12h3M21 10v4M6 3v1M12 3v1M17 3v1'],
      thermostat: ['M10 4a2 2 0 0 1 4 0v10a4 4 0 1 1-4 0ZM12 9v8M17 5h3M17 9h2'],
      snowdon: ['M5 9h3l5-4v14l-5-4H5ZM16 8a6 6 0 0 1 0 8M19 5a10 10 0 0 1 0 14'],
      tvcom: ['M3 5h18v13H3ZM8 22h8M12 18v4'],
      wol: ['M3 3h18v14H3ZM8 22h8M12 17v5M7 13h10'],
      hikvision: ['M3 7h13v11H3ZM16 10l6-3v11l-6-3M7 4h5'],
      bthome: ['M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1 1M18 18l1 1M5 19l1-1M18 6l1-1'],
      bins: ['M5 6h14l-1 15H6ZM3 6h18M9 6V3h6v3M10 10v7M14 10v7']
    };
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('fill', 'none'); svg.setAttribute('stroke', 'currentColor'); svg.setAttribute('stroke-width', '1.5');
    svg.setAttribute('stroke-linecap', 'round'); svg.setAttribute('stroke-linejoin', 'round');
    for (const d of paths[service] || ['M5 5h14v14H5ZM9 9h6v6H9']) {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path'); path.setAttribute('d', d); svg.append(path);
    }
    return svg;
  }

  function customFor(node, code = '') {
    $('device-dialog').close();
    $('advanced-panel').open = true;
    navigate(node.path);
    if (code) prepareCommand(code);
    $('advanced-panel').scrollIntoView({behavior: 'smooth', block: 'start'});
    $('request-path').focus({preventScroll: true});
  }

  function numericRange(node) {
    const numbers = node.commands.filter((code) => /^(0|[1-9]\d*)$/.test(code)).map(Number).sort((a,b) => a-b);
    return numbers.length >= 10 && numbers.every((n,i) => n === numbers[0] + i) ? numbers : null;
  }

  function quickButton(node, code, primary = false) {
    const button = el('button', 'quick-action' + (primary ? ' main-action' : ''), labelAction(code) + (needsArguments.has(code) ? '…' : ''));
    button.type = 'button'; button.dataset.action = code; button.dataset.device = node.path;
    button.setAttribute('aria-label', labelAction(code) + ' · ' + title(node.name));
    button.addEventListener('click', () => needsArguments.has(code) ? customFor(node, code) : runQuick(node, code));
    button.disabled = !!controller;
    return button;
  }

  function deviceControls(node, compact) {
    const container = el('div', 'quick-controls');
    const numbers = numericRange(node);
    if (numbers) {
      const group = el('div', 'device-range');
      const label = el('label', '', serviceOf(node) === 'tvcom' ? title(node.name) : 'Value');
      const row = el('div', 'range-row');
      const range = el('input'); range.type = 'range'; range.min = numbers[0]; range.max = numbers.at(-1); range.step = '1'; range.value = numbers[0];
      const currentValue = deviceStates.get(node.path)?.model.value;
      if (currentValue != null) range.value = currentValue;
      range.setAttribute('aria-label', title(node.name) + ' value');
      const number = el('input'); number.type = 'number'; number.min = range.min; number.max = range.max; number.step = '1'; number.value = range.value; number.required = true;
      number.setAttribute('aria-label', title(node.name) + ' numeric value');
      range.addEventListener('input', () => { number.value = range.value; range.dataset.dirty = 'true'; number.dataset.dirty = 'true'; });
      number.addEventListener('input', () => { number.dataset.dirty = 'true'; range.dataset.dirty = 'true'; if (number.value && number.checkValidity()) range.value = number.value; });
      const apply = el('button', 'quick-action main-action', 'Apply'); apply.type = 'button'; apply.dataset.device = node.path;
      apply.disabled = !!controller;
      apply.addEventListener('click', () => { if (number.reportValidity()) runQuick(node, number.value); });
      row.append(range, number); group.append(label, row, apply); container.append(group);
      // Values are drafts, never a fabricated current device reading.
      container.append(el('small', 'range-hint', 'Choose a value, then apply.'));
    }
    const priority = ['toggle', 'on', 'off', 'power', 'play_pause', 'volume_down', 'volume_up', 'status'];
    const codes = node.commands.filter((code) => !(numbers && /^(0|[1-9]\d*)$/.test(code)));
    codes.sort((a,b) => {
      const ai = priority.indexOf(a), bi = priority.indexOf(b);
      return (ai < 0 ? 100 : ai) - (bi < 0 ? 100 : bi);
    });
    let shown;
    if (compact && serviceOf(node) === 'tvcom' && node.name === 'input_select') {
      shown = ['hdmi_1', 'hdmi_2', 'hdmi_3', 'status'].filter((code) => node.commands.includes(code));
    } else if (compact && serviceOf(node) === 'snowdon') {
      shown = ['power', 'input', 'status'].filter((code) => node.commands.includes(code));
    } else {
      shown = compact ? codes.filter((code) => !needsArguments.has(code)).slice(0, numbers ? 1 : 3) : codes;
    }
    for (const code of shown) container.append(quickButton(node, code, code === 'toggle' || code === 'on' || code === 'power'));
    return container;
  }

  function toggleFavorite(path) {
    if (favorites.has(path)) favorites.delete(path); else favorites.add(path);
    try { localStorage.setItem('kennedn-control-favorites', JSON.stringify([...favorites])); } catch { /* Memory still works. */ }
    renderDashboard();
  }

  let tileSizeFrame;
  function updateTileSizes() {
    const board = $('device-grid');
    const groups = [...board.querySelectorAll('.device-tiles')];
    if (!groups.length) return;
    // Measure real headings and controls with a fixed allowance for readings/messages.
    // This runs on filtering or viewport changes, never on polling/message updates.
    board.classList.add('measuring-tiles');
    const sizes = groups.map((group) => ({group, height: Math.ceil(Math.max(...[...group.children].map((card) => card.getBoundingClientRect().height)) / 4) * 4}));
    board.classList.remove('measuring-tiles');
    const minimum = parseFloat(getComputedStyle(board).getPropertyValue('--tile-min-height')) || 240;
    board.dataset.sizing = 'category';
    for (const {group, height} of sizes) group.style.setProperty('--tile-height', Math.max(minimum, height) + 'px');
  }
  function scheduleTileSizing() {
    cancelAnimationFrame(tileSizeFrame);
    tileSizeFrame = requestAnimationFrame(updateTileSizes);
  }
  window.addEventListener('resize', scheduleTileSizing);
  document.fonts.ready.then(scheduleTileSizing);

  function renderDashboard() {
    if (!bulkController) { $('bulk-progress').textContent = ''; $('bulk-toolbar').hidden = true; }
    const nodes = deviceNodes();
    $('device-count').textContent = nodes.length + ' controls';
    $('service-filters').replaceChildren();
    const services = [...new Set(nodes.map(serviceOf))].sort((a,b) => serviceOrder.indexOf(a) - serviceOrder.indexOf(b));
    for (const [key, label] of [['all', 'All devices'], ['favorites', '★ Favourites'], ...services.map((key) => [key, serviceNames[key] || title(key)])]) {
      const button = el('button', 'service-filter' + (activeService === key ? ' active' : ''), label);
      button.type = 'button'; button.setAttribute('aria-pressed', String(activeService === key));
      button.addEventListener('click', () => { activeService = key; renderDashboard(); });
      $('service-filters').append(button);
    }
    const search = $('device-search').value.trim().toLowerCase();
    const visible = nodes.filter((node) => (activeService === 'all' || (activeService === 'favorites' ? favorites.has(node.path) : serviceOf(node) === activeService)) && (node.path + ' ' + title(node.name) + ' ' + node.commands.join(' ')).toLowerCase().includes(search));
    $('refresh-all').disabled = !!bulkController || !nodes.some((node) => node.commands.includes('status'));
    $('device-grid').replaceChildren();
    $('empty-devices').hidden = !!visible.length;
    $('empty-devices').textContent = activeService === 'favorites' && !favorites.size ? 'Pin the devices you use most with the star on each tile.' : 'No matching devices. Try another service or search.';
    for (const service of services) {
      const groupNodes = visible.filter((node) => serviceOf(node) === service).sort((a,b) => Number(favorites.has(b.path)) - Number(favorites.has(a.path)) || a.name.localeCompare(b.name));
      if (!groupNodes.length) continue;
      const section = el('section', 'device-group');
      const heading = el('div', 'device-group-heading');
      heading.append(el('h2', '', serviceNames[service] || title(service)), el('span', '', groupNodes.length + (groupNodes.length === 1 ? ' control' : ' controls')));
      if (groupNodes.some((node) => node.commands.includes('status'))) {
        const refresh = el('button', 'refresh-category icon-button', '↻'); refresh.type = 'button';
        refresh.setAttribute('aria-label', 'Refresh status for ' + (serviceNames[service] || title(service)));
        refresh.title = 'Refresh ' + (serviceNames[service] || title(service)) + ' statuses';
        refresh.disabled = !!bulkController; refresh.addEventListener('click', () => refreshDevices(groupNodes)); heading.append(refresh);
      }
      const tiles = el('div', 'device-tiles');
      tiles.dataset.service = service;
      for (const [tileIndex, node] of groupNodes.entries()) {
        const card = el('article', 'device-tile'); card.dataset.path = node.path;
        const color = ['#c8225e', '#1d7775', '#66089b'][tileIndex % 3];
        card.style.setProperty('--device-color', color);
        deviceColors.set(node.path, color);
        const pin = el('button', 'favorite-button', favorites.has(node.path) ? '★' : '☆'); pin.type = 'button';
        pin.setAttribute('aria-label', (favorites.has(node.path) ? 'Unpin ' : 'Pin ') + title(node.name));
        pin.setAttribute('aria-pressed', String(favorites.has(node.path)));
        pin.addEventListener('click', () => toggleFavorite(node.path));
        const identity = el('div', 'device-identity');
        identity.append(deviceIcon(service), el('h3', '', title(node.name)));
        const feedback = el('p', 'device-feedback', deviceResults.get(node.path)?.label || ''); feedback.setAttribute('role', 'status');
        paintFeedback(feedback, node);
        const more = el('button', 'more-button', '⋯'); more.type = 'button';
        more.setAttribute('aria-label', 'More controls for ' + title(node.name));
        more.setAttribute('aria-haspopup', 'dialog');
        more.addEventListener('click', () => openDevice(node));
        const tools = el('div', 'tile-tools'); tools.append(pin, more);
        const state = el('div', 'device-state');
        card.append(tools, identity, state, feedback, deviceControls(node, true));
        paintDeviceState(card, state, node);
        tiles.append(card);
      }
      section.append(heading, tiles); $('device-grid').append(section);
    }
    updateTileSizes();
  }

  function openDevice(node) {
    activeDevice = node;
    $('device-dialog').style.setProperty('--device-color', deviceColors.get(node.path) || '#1c817e');
    $('device-dialog-title').textContent = title(node.name);
    $('device-dialog-service').textContent = serviceNames[serviceOf(node)] || title(serviceOf(node));
    $('device-dialog-controls').replaceChildren(deviceControls(node, false));
    renderDeviceFeedback(node);
    if (!$('device-dialog').open) $('device-dialog').showModal();
  }

  function paintDeviceState(host, container, node) {
    const reading = deviceStates.get(node.path);
    const model = reading?.model;
    container.replaceChildren();
    host.dataset.power = model?.power || 'unknown';
    host.dataset.heating = model?.heating === true ? 'true' : 'false';
    host.dataset.online = model?.online || 'unknown';
    host.dataset.stale = reading?.stale ? 'true' : 'false';
    host.style.setProperty('--light-color', model?.color || '#fff4b8');
    if (model?.brightness != null) host.style.setProperty('--light-strength', Math.max(.15, model.brightness / 100));
    if (!model) return;
    const badges = el('div', 'state-badges');
    if (model.power !== null) badges.append(el('span', 'state-badge power-state', model.power === 'on' ? 'On' : 'Off'));
    if (model.online === 'off') badges.append(el('span', 'state-badge', 'Offline'));
    if (model.heating !== null) badges.append(el('span', 'state-badge heating-state', model.heating ? 'Heating' : 'Idle'));
    for (const flag of model.flags) badges.append(el('span', 'state-badge', flag));
    if (model.selection) badges.append(el('span', 'state-badge', title(model.selection)));
    if (reading.stale) badges.append(el('span', 'state-badge stale-state', 'Last known'));
    container.append(badges);
    if (model.metrics.length) {
      const metrics = el('dl', 'state-metrics');
      for (const metric of model.metrics) {
        const cell = el('div', 'state-metric');
        cell.append(el('dt', '', metric.label), el('dd', '', metric.value + metric.unit));
        metrics.append(cell);
      }
      container.append(metrics);
    }
    for (const button of host.querySelectorAll('[data-action=toggle]')) {
      if (model.power !== null) {
        button.textContent = reading.stale ? 'Toggle' : model.power === 'on' ? 'Turn off' : 'Turn on';
        button.setAttribute('aria-label', button.textContent + ' · ' + title(node.name));
        if (reading.stale) button.removeAttribute('aria-pressed');
        else button.setAttribute('aria-pressed', String(model.power === 'on'));
      }
    }
    for (const button of host.querySelectorAll('[data-action]')) {
      const matches = button.dataset.action === model.selection || (['on', 'off'].includes(button.dataset.action) && button.dataset.action === model.power);
      button.classList.toggle('state-selected', matches);
      if (['on', 'off'].includes(button.dataset.action)) button.setAttribute('aria-pressed', String(matches));
    }
    if (model.value !== null) {
      for (const input of host.querySelectorAll('.device-range input')) {
        if (input.dataset.dirty !== 'true') input.value = model.value;
      }
    }
  }

  function paintFeedback(element, node) {
    const result = deviceResults.get(node.path);
    element.dataset.kind = result?.kind || '';
    element.replaceChildren();
    if (pendingStatusChecks.has(node.path) && !['pending', 'error', 'unconfirmed'].includes(result?.kind)) {
      element.append(el('span', 'polling-state', 'Updating status…'));
    } else element.textContent = result?.label || '';
  }

  function renderDeviceFeedback(node) {
    const result = deviceResults.get(node.path);
    for (const card of $('device-grid').querySelectorAll('.device-tile')) {
      if (card.dataset.path === node.path) {
        const feedback = card.querySelector('.device-feedback');
        paintFeedback(feedback, node);
        paintDeviceState(card, card.querySelector('.device-state'), node);
      }
    }
    if (activeDevice?.path === node.path) {
      paintDeviceState($('device-dialog'), $('device-dialog-state'), node);
      paintFeedback($('device-dialog-feedback'), node);
      $('device-dialog-response').textContent = result?.body || 'No response yet.';
    }
  }

  async function runQuick(node, code) {
    if (controller) return;
    deviceResults.set(node.path, {kind: 'pending', label: labelAction(code) + ' · sending…'});
    renderDeviceFeedback(node);
    const url = apiURL(node.path); url.searchParams.set('code', code);
    const result = await sendRequest({url, options: {method: 'POST'}});
    if (result?.ok && /^\d+$/.test(code)) {
      for (const input of document.querySelectorAll('.device-range input')) {
        const owner = input.closest('.device-tile');
        if ((owner?.dataset.path === node.path || (!owner && activeDevice?.path === node.path)) && input.value === code) delete input.dataset.dirty;
      }
      renderDeviceFeedback(node);
    }
  }

  $('refresh-all').addEventListener('click', () => refreshDevices(deviceNodes()));
  $('cancel-refresh').addEventListener('click', () => bulkController?.abort());
  window.addEventListener('pagehide', cancelStatusWork);
  $('device-search').addEventListener('input', () => { if (catalog) renderDashboard(); });
  $('device-close').addEventListener('click', () => $('device-dialog').close());
  $('device-custom').addEventListener('click', () => { if (activeDevice) customFor(activeDevice); });

  async function init() {
    try {
      const response = await fetch(document.body.dataset.catalog);
      if (!response.ok) throw new Error('Cannot load the generated API catalog (HTTP ' + response.status + '). Run make build.');
      catalog = await response.json();
      if (!catalog.nodes?.[catalog.root]) throw new Error('The API catalog is invalid. Run make build.');
      $('api-origin').textContent = apiBase;
      $('node-count').textContent = Object.keys(catalog.nodes).length;
      $('snapshot-date').textContent = new Date(catalog.generatedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
      expanded.add(catalog.root);
      navigate(location.hash.slice(1) || catalog.root, false);
      renderDashboard();
      if (location.hash.slice(1) && location.hash.slice(1) !== catalog.root) $('advanced-panel').open = true;
      void checkConnection();
    } catch (error) {
      $('notice').textContent = error.message; $('notice').hidden = false;
      connectionError('Catalog unavailable');
      $('send').disabled = true; $('inspect').disabled = true; $('auth-button').disabled = true;
    }
  }
  void init();
})();
