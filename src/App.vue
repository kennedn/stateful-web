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
        <StatefulView v-if="mode === 'stateful'" />
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
import { ref } from 'vue';
import AuthModal from './components/AuthModal.vue';
import StatefulView from './components/StatefulView.vue';
import ThermostatPanel from './components/ThermostatPanel.vue';
import { useAuth } from './composables/useAuth';

const mode = ref<'stateful' | 'thermostat'>('stateful');

const { username, password, showAuthPrompt, setCredentials, closeAuthPrompt } =
  useAuth();

function handleAuthSubmit(payload: { username: string; password: string }) {
  setCredentials(payload.username, payload.password);
}
</script>
