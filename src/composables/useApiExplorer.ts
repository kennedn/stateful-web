// src/composables/useApiExplorer.ts
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { useAuth } from './useAuth';

const CACHE_KEY = 'stateful_api_cache_v1';

export function useApiExplorer() {
  const currentPathSegments = ref<string[]>([]);
  const items = ref<string[]>([]);
  const loading = ref(false);
  const errorMessage = ref('');

  const statusLabel = ref('');
  const responseText = ref('');

  const { requestWithAuth, API_BASE_URL, authVersion } = useAuth();

  const pathCache = ref<Record<string, string[]>>({});
  const childInfo = ref<
    Record<string, { hasChildren: boolean; list: string[] | null }>
  >({});

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

  async function fetchRaw(path: string, options: RequestInit = {}) {
    const method = (options.method || 'GET').toUpperCase();
    try {
      const { response, json, text, url } = await requestWithAuth(path, options);

      // If we get a 401 on ANY request (navigation or background prefetch),
      // expand the terminal and show the unauthorized response for context.
      if (response.status === 401) {
        setGlobalResult(
          `${method} ${url}`,
          `${response.status} ${text || '(no body)'}`,
        );
      }

      return { ok: response.ok, status: response.status, json, text };
    } catch (e: any) {
      // Network / fetch-level error: also show in terminal
      setGlobalResult(`${method} ${API_BASE_URL}${path}`, String(e));
      return { ok: false, status: 0, json: null, text: String(e) };
    }
  }

  async function fetchList(path: string, logToTerminal = false) {
    if (pathCache.value[path]) {
      const cached = pathCache.value[path];
  
      if (logToTerminal) {
        // Show cached GET in terminal as well
        setGlobalResult(`GET ${API_BASE_URL}${path}`, { data: cached });
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
      setGlobalResult(`GET ${API_BASE_URL}${path}`, json);
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
  ) {
    const basePath = pathToString(pathSegments);
    let query = basePath + '?code=' + encodeURIComponent(code);

    const { ok, status, json, text } = await fetchRaw(query, {
      method: 'POST',
    });
    const label = `POST ${API_BASE_URL}${query}`;

    if (!ok || status !== 200) {
      setGlobalResult(label, `${status} ${text || ''}`);
      return;
    }
    const body = json || text || '';
    setGlobalResult(label, body);
  }

  async function loadChildInfo(pathSegments: string[], itemsArr: string[]) {
    const info: Record<string, { hasChildren: boolean; list: string[] | null }> =
      {};
    for (const item of itemsArr) {
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
    childInfo.value = info;
  }

  async function navigateTo(
    pathSegments: string[],
    knownItems: string[] | null = null,
    push = true,
  ) {
    loading.value = true;
    errorMessage.value = '';
    try {
      const path = pathToString(pathSegments);
      const resolvedItems =
        knownItems || ((await fetchList(path)) as string[]);

      currentPathSegments.value = pathSegments;
      items.value = resolvedItems;
      childInfo.value = {};

      if (push) {
        history.pushState({ pathSegments }, '', '#' + path);
      }

      if (!rangeInfo.value.isRange) {
        await loadChildInfo(pathSegments, resolvedItems);
      }
    } catch (e: any) {
      errorMessage.value = `Error loading ${pathToString(pathSegments)}: ${
        e.message
      }`;
    } finally {
      loading.value = false;
    }
  }

  function onPopState(event: PopStateEvent) {
    const segments = (event.state?.pathSegments as string[]) || [];
    navigateTo(segments, null, false);
  }

  watch(authVersion, () => {
    navigateTo([...currentPathSegments.value], null, false);
  });

  function setRowBackgroundFromEvent(e: Event) {
    const row = e.currentTarget as HTMLElement | null;
    if (!row) return;
    const color = getComputedStyle(row).backgroundColor;
    document.body.style.backgroundColor = color;
  }

  onMounted(async () => {
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
    rangeInfo,
    rangeCode,
    rangeWithValue,
    rangeValue,
    childInfo,

    // API
    navigateTo,
    postCode,
    setRowBackgroundFromEvent,
  };
}

