<template>
  <div>
    <div class="app">
      <div class="content-shell">
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
          <template v-if="mode === 'stateful'">
            <PathBreadcrumb
              class="path"
              :segments="currentPathSegments"
              @navigateRoot="navigateTo([], null, true)"
              @navigateTo="(segPath) => navigateTo(segPath, null, true)"
            />
            <ItemsView
              :items="items"
              :loading="loading"
              :error-message="errorMessage"
              :range-info="rangeInfo"
              :range-code="rangeCode"
              :range-with-value="rangeWithValue"
              :range-value="rangeValue"
              :child-info="childInfo"
              :current-path="currentPathSegments"
              @update:rangeCode="rangeCode = $event"
              @update:rangeWithValue="rangeWithValue = $event"
              @update:rangeValue="rangeValue = $event"
              @post="postCode"
              @navigate="navigateTo"
              @setRowBackground="setRowBackgroundFromEvent"
            />
          </template>

          <ThermostatView
            v-else
            :loading="thermostatLoading"
            :error-message="thermostatError"
            :radiator-status="radiatorStatus"
            :bthome-status="bthomeStatus"
            :thermostat-status="thermostatStatus"
            @refresh="refreshThermostat"
          />
        </main>
      </div>
    </div>

    <ExplorerPanel
      v-if="mode === 'stateful'"
      :status="statusLabel"
      :response="responseText"
      :showAuth="showAuthPanel"
      :username="authUsername"
      :password="authPassword"
      @drag-mouse-down="handleHandleMouseDown"
      @drag-touch-start="handleHandleTouchStart"
      @update:username="authUsername = $event"
      @update:password="authPassword = $event"
      @submit-auth="handleAuthSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { watch, ref } from 'vue';
import { useApiExplorer } from './composables/useApiExplorer';
import { useThermostatStatus } from './composables/useThermostatStatus';
import PathBreadcrumb from './components/PathBreadcrumb.vue';
import ItemsView from './components/ItemsView.vue';
import ExplorerPanel from './components/ExplorerPanel.vue';
import ThermostatView from './components/ThermostatView.vue';

const mode = ref<'stateful' | 'thermostat'>('stateful');

const {
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
  childInfo,
  showAuthPanel,
  navigateTo,
  postCode,
  handleAuthSubmit,
  setRowBackgroundFromEvent,
  handleHandleMouseDown,
  handleHandleTouchStart,
} = useApiExplorer();

const {
  loading: thermostatLoading,
  errorMessage: thermostatError,
  radiatorStatus,
  bthomeStatus,
  thermostatStatus,
  refresh,
} = useThermostatStatus();

const refreshThermostat = () => refresh();

watch(
  mode,
  (value) => {
    if (value === 'thermostat') {
      refresh();
    }
  },
  { immediate: false },
);
</script>
