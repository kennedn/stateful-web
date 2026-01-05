<template>
  <div class="thermostat-view">
    <div class="thermostat-heading">
      <div>
        <h2>Home devices overview</h2>
        <p class="helper-text">
          Build cards from thermostat, radiator, and bulb endpoints with swappable data blocks.
        </p>
      </div>
      <button class="refresh" type="button" :disabled="loading" @click="emit('refresh')">
        {{ loading ? 'Loading…' : 'Refresh' }}
      </button>
    </div>

    <div class="filter-row" role="group" aria-label="Device type filter">
      <button
        class="filter-chip"
        type="button"
        :aria-pressed="selectedTypes.length === availableTypes.length"
        @click="emit('select-all')"
      >
        All types
      </button>
      <button
        v-for="type in availableTypes"
        :key="type"
        class="filter-chip"
        type="button"
        :aria-pressed="selectedTypes.includes(type)"
        @click="emit('toggle-type', type)">
        <span class="chip-dot" :class="type"></span>
        {{ formatTypeLabel(type) }}
      </button>
    </div>

    <div v-if="errorMessage" class="callout error">{{ errorMessage }}</div>
    <div v-else-if="loading" class="callout">Loading device data…</div>

    <div v-else class="thermostat-grid" aria-label="Device cards">
      <div v-if="cards.length" class="device-grid">
        <article
          v-for="card in cards"
          :key="card.id"
          class="device-card"
          :class="[{ 'is-heating': card.isActive }, card.kind]"
        >
          <div class="device-icon" :class="card.icon" aria-hidden="true">
            <svg
              v-if="card.icon === 'radiator'"
              width="64"
              height="64"
              viewBox="0 0 24 24"
              role="img"
              aria-label="Radiator icon"
            >
              <path
                d="M7.95 3 6.53 5.19 7.95 7.4h-.01L5.95 10.5 4.22 9.6 5.64 7.39 4.22 5.19 6.22 2.09 7.95 3Zm6-.11-1.42 2.21 1.42 2.2h-.01L11.95 10.4 10.22 9.5 11.64 7.3l-1.42-2.2 2-3.1 1.73.89ZM20 2.89l-1.44 2.21L20 7.3V7.31L18 10.4l-1.75-.9 1.42-2.2-1.42-2.2 2-3.1 1.75.89ZM2 22v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8h-2v-2H4v2H2Zm4-8a1 1 0 0 0-1 1v2a1 1 0 0 0 2 0v-2a1 1 0 0 0-1-1Zm4 0a1 1 0 0 0-1 1v2a1 1 0 0 0 2 0v-2a1 1 0 0 0-1-1Zm4 0a1 1 0 0 0-1 1v2a1 1 0 0 0 2 0v-2a1 1 0 0 0-1-1Zm4 0a1 1 0 0 0-1 1v2a1 1 0 0 0 2 0v-2a1 1 0 0 0-1-1Z"
                fill="currentColor"
              />
            </svg>
            <svg
              v-else-if="card.icon === 'thermostat'"
              width="64"
              height="64"
              viewBox="0 0 24 24"
              role="img"
              aria-label="Boiler icon"
            >
              <path
                d="M8 2C6.89 2 6 2.89 6 4v12c0 1.11.89 2 2 2h1v2H6v2h3c1.11 0 2-.89 2-2v-2h2v2c0 1.11.89 2 2 2h3v-2h-3v-2h1c1.11 0 2-.89 2-2V4c0-1.11-.89-2-2-2Zm4 2.97a2 2 0 0 1 2 2 2 2 0 0 1-2 2 2 2 0 0 1-2-2 2 2 0 0 1 2-2M10 14.5h4V16h-4Z"
                fill="currentColor"
              />
            </svg>
            <svg
              v-else
              width="64"
              height="64"
              viewBox="0 0 24 24"
              role="img"
              aria-label="Light bulb icon"
            >
              <path
                d="M9 21a1 1 0 0 1-1-1v-1.29c-2.92-1.62-4-5.35-2.38-8.27 1.62-2.91 5.35-3.97 8.26-2.35 2.92 1.62 3.97 5.35 2.35 8.27A6 6 0 0 1 14 18.71V20a1 1 0 0 1-1 1Zm4-2v-1.13c0-.37.2-.72.52-.9a4 4 0 0 0 1.84-2.67c.4-2.2-1.08-4.32-3.28-4.72a4 4 0 0 0-4.72 3.28 3.98 3.98 0 0 0 1.84 4.11c.33.18.52.53.52.9V19Zm-2.38-.5h.76a.62.62 0 0 0 .62-.62v-.04a.62.62 0 0 0-.62-.62h-.76a.62.62 0 0 0-.62.62v.04c0 .34.28.62.62.62Z"
                fill="currentColor"
              />
            </svg>
          </div>

          <div class="device-body">
            <div class="device-heading">
              <div>
                <p class="eyebrow">{{ card.eyebrow }}</p>
                <h4>{{ card.name }}</h4>
              </div>
              <small v-if="card.meta" class="device-meta">{{ card.meta }}</small>
            </div>

            <div class="stat-grid">
              <div v-if="card.status" class="stat">
                <p class="label">{{ card.kind === 'bulb' ? 'Power' : 'Status' }}</p>
                <p class="value">
                  <button
                    v-if="card.kind === 'bulb'"
                    class="power-toggle"
                    type="button"
                    :disabled="loading"
                    @click="emit('toggle-power', card.id)"
                  >
                    <span class="heating-pill" :class="card.status.tone">
                      <span class="pulse" aria-hidden="true"></span>
                      {{ card.status.label }}
                    </span>
                  </button>
                  <span v-else class="heating-pill" :class="card.status.tone">
                    <span class="pulse" aria-hidden="true"></span>
                    {{ card.status.label }}
                  </span>
                </p>
              </div>
              <div
                v-for="(element, index) in card.elements"
                :key="`${card.id}-el-${index}`"
                class="stat"
              >
                <p class="label">{{ element.label }}</p>
                <p class="value">
                  <button
                    v-if="element.isPower"
                    class="power-toggle"
                    type="button"
                    :disabled="loading"
                    @click="emit('toggle-power', card.id)"
                  >
                    <span class="heating-pill" :class="element.tone">
                      <span class="pulse" aria-hidden="true"></span>
                      {{ element.value }}
                    </span>
                  </button>
                  <span v-else-if="element.tone" class="heating-pill" :class="element.tone">
                    <span class="pulse" aria-hidden="true"></span>
                    {{ element.value }}
                  </span>
                  <span v-else>{{ element.value }}</span>
                </p>
              </div>
            </div>
          </div>
        </article>
      </div>

      <div v-else class="table-empty">No device data.</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { toRefs } from 'vue';
import type { DeviceCard, DeviceType } from '../composables/useDeviceCards';

const props = defineProps<{
  loading: boolean;
  errorMessage: string;
  cards: DeviceCard[];
  availableTypes: DeviceType[];
  selectedTypes: DeviceType[];
}>();

const emit = defineEmits<{
  (e: 'refresh'): void;
  (e: 'toggle-type', type: DeviceType): void;
  (e: 'select-all'): void;
  (e: 'toggle-power', id: string): void;
}>();

const { loading, errorMessage, cards, availableTypes, selectedTypes } = toRefs(props);

function formatTypeLabel(type: DeviceType) {
  if (type === 'bulb') return 'Bulb';
  if (type === 'radiator') return 'Radiator';
  return 'Thermostat';
}
</script>
