<template>
  <div>
    <div class="app">
      <div class="header">
        <div class="mode-toggle" role="tablist" aria-label="Mode selector">
          <button
            type="button"
            role="tab"
            :aria-selected="mode === 'stateful'"
            :class="['mode-btn', { active: mode === 'stateful' }]"
            @click="mode = 'stateful'"
          >
            stateful
          </button>
          <button
            type="button"
            role="tab"
            :aria-selected="mode === 'thermostat'"
            :class="['mode-btn', { active: mode === 'thermostat' }]"
            @click="mode = 'thermostat'"
          >
            thermostat
          </button>
        </div>
      </div>

      <main class="main">
        <StatefulView v-if="mode === 'stateful'" :auth-active="showAuthPrompt" />
        <ThermostatPanel v-else />
      </main>
    </div>

    <AuthModal
      :open="showAuthPrompt"
      :username="username"
      :password="password"
      @close="closeAuthPrompt"
      @submit="handleAuthSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import AuthModal from './components/AuthModal.vue';
import StatefulView from './components/StatefulView.vue';
import ThermostatPanel from './components/ThermostatPanel.vue';
import { useAuth } from './composables/useAuth';

const DEFAULT_MODE: 'stateful' | 'thermostat' = 'stateful';
const MODE_CACHE_KEY = 'stateful_web_mode_v1';
const DEFAULT_TERMINAL_HEIGHT = '220px';

const mode = ref<'stateful' | 'thermostat'>(DEFAULT_MODE);
const terminalHeightBeforeAuth = ref(DEFAULT_TERMINAL_HEIGHT);

const { username, password, showAuthPrompt, setCredentials, closeAuthPrompt } =
  useAuth();

onMounted(() => {
  try {
    const cachedMode = window.localStorage.getItem(MODE_CACHE_KEY);
    if (cachedMode === 'stateful' || cachedMode === 'thermostat') {
      mode.value = cachedMode;
    }
  } catch {
    mode.value = DEFAULT_MODE;
  }

  document.documentElement.style.setProperty(
    '--terminal-height',
    DEFAULT_TERMINAL_HEIGHT,
  );
});

watch(mode, (value) => {
  try {
    window.localStorage.setItem(MODE_CACHE_KEY, value);
  } catch {
    // ignore storage errors
  }
});

watch(showAuthPrompt, (open) => {
  const root = document.documentElement;
  const currentHeight =
    getComputedStyle(root).getPropertyValue('--terminal-height').trim() ||
    DEFAULT_TERMINAL_HEIGHT;

  if (open) {
    terminalHeightBeforeAuth.value = currentHeight;
    root.style.setProperty('--terminal-height', '0px');
  } else {
    root.style.setProperty(
      '--terminal-height',
      terminalHeightBeforeAuth.value || DEFAULT_TERMINAL_HEIGHT,
    );
  }
});

function handleAuthSubmit(payload: { username: string; password: string }) {
  setCredentials(payload.username, payload.password);
}
</script>
