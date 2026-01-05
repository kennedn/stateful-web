import { computed, ref } from 'vue';

const API_BASE_URL = 'https://api.kennedn.com/v2';
const AUTH_CACHE_KEY = 'stateful_web_auth_v1';

const cachedUsername = ref('');
const cachedPassword = ref('');
const showAuthPrompt = ref(false);
let cacheLoaded = false;

function loadCachedCredentials() {
  if (cacheLoaded) return;
  cacheLoaded = true;
  try {
    const raw = window.localStorage.getItem(AUTH_CACHE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      cachedUsername.value = parsed.username || '';
      cachedPassword.value = parsed.password || '';
    }
  } catch {
    cachedUsername.value = '';
    cachedPassword.value = '';
  }
}

function saveCachedCredentials() {
  try {
    window.localStorage.setItem(
      AUTH_CACHE_KEY,
      JSON.stringify({
        username: cachedUsername.value,
        password: cachedPassword.value,
      }),
    );
  } catch {
    // ignore storage errors
  }
}

const authHeader = computed(() => {
  const username = (cachedUsername.value || '').trim();
  const password = cachedPassword.value || '';
  if (!username && !password) return null;
  try {
    return `Basic ${btoa(`${username}:${password}`)}`;
  } catch {
    return null;
  }
});

function applyAuth(headers: Headers) {
  const header = authHeader.value;
  if (header) {
    headers.set('Authorization', header);
  }
}

function setCredentials(username: string, password: string) {
  cachedUsername.value = username;
  cachedPassword.value = password;
  saveCachedCredentials();
  showAuthPrompt.value = false;
}

function requireAuthPrompt() {
  showAuthPrompt.value = true;
}

function closeAuthPrompt() {
  showAuthPrompt.value = false;
}

async function requestWithAuth(path: string, options: RequestInit = {}) {
  loadCachedCredentials();
  const headers = new Headers(options.headers || {});
  applyAuth(headers);
  const url = `${API_BASE_URL}${path}`;
  const response = await fetch(url, { ...options, headers });

  const text = await response.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (response.status === 401) {
    requireAuthPrompt();
  }

  return { response, text, json, url };
}

export function useAuth() {
  loadCachedCredentials();

  return {
    username: cachedUsername,
    password: cachedPassword,
    authHeader,
    showAuthPrompt,
    setCredentials,
    requestWithAuth,
    requireAuthPrompt,
    closeAuthPrompt,
    API_BASE_URL,
  };
}

export { API_BASE_URL };
