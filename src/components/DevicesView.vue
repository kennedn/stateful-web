<template>
  <div class="device-view">
    <div class="device-toolbar">
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
        @click="emit('toggle-type', type)"
      >
        <span class="chip-dot" :class="type"></span>
        {{ formatTypeLabel(type) }}
      </button>
    </div>

    <div v-if="errorMessage" class="callout error">{{ errorMessage }}</div>
    <div v-else-if="loading" class="callout">Loading device data…</div>

    <div v-else class="device-grid-wrapper" aria-label="Device cards">
      <div v-if="cards.length" class="device-grid">
        <article
          v-for="card in cards"
          :key="card.id"
          class="device-card"
          :class="[{ 'is-heating': card.isActive }, card.kind]"
        >
          <div class="device-icon" :class="card.icon">
            <img :src="iconSources[card.icon]" :alt="`${formatTypeLabel(card.kind)} icon`" />
          </div>

          <div class="device-body">
            <div class="card-heading">
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
import bulbIcon from '../assets/icons/bulb.svg';
import boilerIcon from '../assets/icons/boiler.svg';
import radiatorIcon from '../assets/icons/radiator.svg';
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

const iconSources: Record<DeviceType, string> = {
  bulb: bulbIcon,
  thermostat: boilerIcon,
  radiator: radiatorIcon,
};

function formatTypeLabel(type: DeviceType) {
  if (type === 'bulb') return 'Bulb';
  if (type === 'radiator') return 'Radiator';
  return 'Thermostat';
}
</script>
