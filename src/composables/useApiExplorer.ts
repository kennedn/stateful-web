// src/composables/useApiExplorer.ts
import { computed, onMounted, onBeforeUnmount, ref } from 'vue';

const BASE_URL = 'https://api.kennedn.com/v2';
const CACHE_KEY = 'stateful_api_cache_v1';
const showAuthPanel = ref(false);

export function useApiExplorer() {
  const currentPathSegments = ref<string[]>([]);
  const items = ref<string[]>([]);
  const loading = ref(false);
  const errorMessage = ref('');

  const statusLabel = ref('');
  const responseText = ref('');

  const authUsername = ref('');
  const authPassword = ref('');
  const authHeader = ref<string | null>(null);

  const pathCache = ref<Record<string, string[]>>({});
  const rowStates = ref<Record<string, { withValue: boolean; value: string }>>(
    {},
  );
  const childInfo = ref<
    Record<string, { hasChildren: boolean; list: string[] | null }>
  >({});

  let currentNavToken = 0;
  let dragState:
    | null
    | {
        startY: number;
        startHeight: number;
      } = null;

  function loadCache() {
    try {
      const raw = window.localStorage.getItem(CACHE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        pathCache.value = parsed;
      }
    } catch {
      pathCache.value = {};
    }
  }

  function saveCache() {
    try {
      window.localStorage.setItem(CACHE_KEY, JSON.stringify(pathCache.value));
    } catch {
      // ignore
    }
  }

  function setTerminalHeight(px: number) {
    const clamped = Math.min(Math.max(px, 120), window.innerHeight * 0.8);
    document.documentElement.style.setProperty(
      '--terminal-height',
      clamped + 'px',
    );
  }

  function startDrag(clientY: number) {
    dragState = {
      startY: clientY,
      startHeight:
        parseInt(
          getComputedStyle(document.documentElement).getPropertyValue(
            '--terminal-height',
          ),
          10,
        ) || 220,
    };
    document.body.style.userSelect = 'none';
    document.body.style.touchAction = 'none';
  }

  function moveDrag(clientY: number) {
    if (!dragState) return;
    const dy = dragState.startY - clientY;
    const newHeight = dragState.startHeight + dy;
    setTerminalHeight(newHeight);
  }

  function endDrag() {
    if (!dragState) return;
    dragState = null;
    document.body.style.userSelect = '';
    document.body.style.touchAction = '';
  }

  function pathToString(segments: string[]) {
    if (!segments.length) return '/';
    return '/' + segments.map(encodeURIComponent).join('/');
  }

  function hashToSegments() {
    const hash = window.location.hash || '';
    if (!hash.startsWith('#/')) return [];
    const path = hash.slice(2);
    if (!path) return [];
    return path
      .split('/')
      .filter(Boolean)
      .map(decodeURIComponent);
  }

  function buildAuthHeader() {
    const u = (authUsername.value || '').trim();
    const p = authPassword.value || '';
    if (!u && !p) {
      authHeader.value = null;
      return;
    }
    try {
      const token = btoa(`${u}:${p}`);
      authHeader.value = `Basic ${token}`;
    } catch {
      authHeader.value = null;
    }
  }

  async function fetchRaw(path: string, options: RequestInit = {}) {
    const url = BASE_URL + path;
    const method = (options.method || 'GET').toUpperCase();
    const headers = new Headers(options.headers || {});
  
    if (authHeader.value) {
      headers.set('Authorization', authHeader.value);
    }
  
    const fetchOptions: RequestInit = { ...options, headers };
  
    try {
      const res = await fetch(url, fetchOptions);
      const text = await res.text();
      let json: any = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        // ignore non-JSON bodies
      }
  
      // If we get a 401 on ANY request (navigation or background prefetch),
      // show it in the terminal and surface the auth panel.
      if (res.status === 401) {
        showAuthPanel.value = true;

        setTerminalHeight(window.innerHeight * 0.5)
  
        // Log the 401 to the terminal output
        setGlobalResult(
          `${method} ${url}`,
          `${res.status} ${text || '(no body)'}`,
        );
      }
  
      // You can optionally log other non-2xx statuses as well:
      // if (!res.ok && res.status !== 401) {
      //   setGlobalResult(
      //     `${method} ${url}`,
      //     `${res.status} ${text || '(no body)'}`,
      //   );
      // }
  
      return { ok: res.ok, status: res.status, json, text };
    } catch (e: any) {
      // Network / fetch-level error: also show in terminal
      setGlobalResult(`${method} ${url}`, String(e));
      return { ok: false, status: 0, json: null, text: String(e) };
    }
  }

  async function fetchList(path: string, logToTerminal = false) {
    if (pathCache.value[path]) {
      const cached = pathCache.value[path];
  
      if (logToTerminal) {
        // Show cached GET in terminal as well
        setGlobalResult(`GET ${BASE_URL}${path}`, { data: cached });
      }
  
      return cached;
    }
  
    const { ok, status, json, text } = await fetchRaw(path);
  
    if (!ok || status !== 200) {
      throw new Error(`${status} on ${path}: ${text || '(no body)'}`);
    }
    if (!json || !Array.isArray(json.data)) {
      throw new Error(`Unexpected response at ${path}`);
    }
  
    // Cache and persist
    pathCache.value[path] = json.data;
    saveCache();
  
    if (logToTerminal) {
      // Log the successful GET to the terminal
      setGlobalResult(`GET ${BASE_URL}${path}`, json);
    }
  
    return json.data as string[];
  }

  async function tryFetchList(path: string) {
    if (pathCache.value[path]) {
      return pathCache.value[path];
    }
    const { ok, status, json } = await fetchRaw(path);
    if (!ok || status !== 200) return null;
    if (!json || !Array.isArray(json.data)) return null;
    pathCache.value[path] = json.data;
    saveCache();
    return json.data as string[];
  }

  function analyzeNumericRange(items: string[]) {
    const nums: number[] = [];
    const extras: string[] = [];
    for (const item of items) {
      const n = Number(item);
      if (Number.isInteger(n) && n >= 0 && n <= 100) {
        nums.push(n);
      } else {
        extras.push(item);
      }
    }
    if (!nums.length) return { isRange: false, extras: [] as string[] };
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    if (min === 0 && max === 100 && nums.length >= 50) {
      return { isRange: true, extras };
    }
    return { isRange: false, extras: [] as string[] };
  }

  const rangeInfo = computed(() => analyzeNumericRange(items.value));
  const rangeCode = ref(50);
  const rangeWithValue = ref(false);
  const rangeValue = ref('');

  function setGlobalResult(label: string, payload: unknown) {
    statusLabel.value = label;
    responseText.value =
      typeof payload === 'string'
        ? payload
        : JSON.stringify(payload, null, 2);
  }

  async function postCode(
    pathSegments: string[],
    code: string,
    extraValue: string | null,
  ) {
    const basePath = pathToString(pathSegments);
    let query = basePath + '?code=' + encodeURIComponent(code);
    if (extraValue !== null && extraValue !== '') {
      query += '&value=' + encodeURIComponent(extraValue);
    }

    const { ok, status, json, text } = await fetchRaw(query, {
      method: 'POST',
    });
    const label = `POST ${BASE_URL}${query}`;

    if (!ok || status !== 200) {
      setGlobalResult(label, `${status} ${text || ''}`);
      return;
    }
    const body = json || text || '';
    setGlobalResult(label, body);
  }

  function getRowState(key: string) {
    if (!rowStates.value[key]) {
      rowStates.value[key] = { withValue: false, value: '' };
    }
    return rowStates.value[key];
  }

  async function loadChildInfo(pathSegments: string[], itemsArr: string[], navToken: number) {
    const info: Record<string, { hasChildren: boolean; list: string[] | null }> =
      {};
    for (const item of itemsArr) {
      if (navToken !== currentNavToken) return;
      const childSegments = [...pathSegments, item];
      const childPath = pathToString(childSegments);
      let childList: string[] | null = null;
      try {
        childList = await tryFetchList(childPath);
      } catch {
        childList = null;
      }
      info[item] = {
        hasChildren: Array.isArray(childList) && childList.length > 0,
        list: childList,
      };
    }
    if (navToken === currentNavToken) {
      childInfo.value = info;
    }
  }

  async function navigateTo(
    pathSegments: string[],
    knownItems: string[] | null = null,
    push = true,
  ) {
    const navToken = ++currentNavToken;
    loading.value = true;
    errorMessage.value = '';
    try {
      const path = pathToString(pathSegments);
      const resolvedItems =
        knownItems || ((await fetchList(path)) as string[]);

      if (navToken !== currentNavToken) return;

      currentPathSegments.value = pathSegments;
      items.value = resolvedItems;
      rowStates.value = {};
      childInfo.value = {};

      if (push && navToken === currentNavToken) {
        history.pushState({ pathSegments }, '', '#' + path);
      }

      if (!rangeInfo.value.isRange) {
        await loadChildInfo(pathSegments, resolvedItems, navToken);
      }
    } catch (e: any) {
      if (navToken !== currentNavToken) return;
      errorMessage.value = `Error loading ${pathToString(pathSegments)}: ${
        e.message
      }`;
    } finally {
      if (navToken === currentNavToken) {
        loading.value = false;
      }
    }
  }

  function handleAuthSubmit() {
    buildAuthHeader();
    showAuthPanel.value = false;
    navigateTo(currentPathSegments.value, null, false);
  }

  function onPopState(event: PopStateEvent) {
    const segments = (event.state?.pathSegments as string[]) || [];
    navigateTo(segments, null, false);
  }

  function initTerminalHeight() {
    setTerminalHeight(
      parseInt(
        getComputedStyle(document.documentElement).getPropertyValue(
          '--terminal-height',
        ),
        10,
      ) || 220,
    );
  }

  function handleMouseMove(e: MouseEvent) {
    moveDrag(e.clientY);
  }
  function handleMouseUp() {
    endDrag();
  }
  function handleTouchMove(e: TouchEvent) {
    if (!dragState) return;
    const touch = e.touches[0];
    if (!touch) return;
    e.preventDefault();
    moveDrag(touch.clientY);
  }
  function handleTouchEnd() {
    endDrag();
  }

  function handleHandleMouseDown(e: MouseEvent) {
    startDrag(e.clientY);
  }
  function handleHandleTouchStart(e: TouchEvent) {
    const t = e.touches[0];
    if (!t) return;
    startDrag(t.clientY);
  }

  function setRowBackgroundFromEvent(e: Event) {
    const row = e.currentTarget as HTMLElement | null;
    if (!row) return;
    const color = getComputedStyle(row).backgroundColor;
    document.body.style.backgroundColor = color;
  }

  onMounted(async () => {
    initTerminalHeight();

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mouseleave', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchEnd);
    window.addEventListener('resize', () => {
      const current =
        parseInt(
          getComputedStyle(document.documentElement).getPropertyValue(
            '--terminal-height',
          ),
          10,
        ) || 220;
      setTerminalHeight(current);
    });
    window.addEventListener('popstate', onPopState);

    loadCache();

    const initialSegments = hashToSegments();
    try {
      await navigateTo(initialSegments, null, false);
      history.replaceState(
        { pathSegments: initialSegments },
        '',
        '#' + pathToString(initialSegments),
      );
    } catch (e: any) {
      errorMessage.value = `Error loading ${
        pathToString(initialSegments) || '/'
      }: ${e.message}`;
    }
  });

  onBeforeUnmount(() => {
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    window.removeEventListener('mouseleave', handleMouseUp);
    window.removeEventListener('touchmove', handleTouchMove);
    window.removeEventListener('touchend', handleTouchEnd);
    window.removeEventListener('touchcancel', handleTouchEnd);
    window.removeEventListener('popstate', onPopState);
  });

  return {
    // state
    currentPathSegments,
    items,
    loading,
    errorMessage,
    statusLabel,
    responseText,
    authUsername,
    authPassword,
    rangeInfo,
    rangeCode,
    rangeWithValue,
    rangeValue,
    rowStates,
    childInfo,
    showAuthPanel,

    // API
    navigateTo,
    postCode,
    handleAuthSubmit,
    getRowState,
    setRowBackgroundFromEvent,

    // terminal drag handlers
    handleHandleMouseDown,
    handleHandleTouchStart,
  };
}

