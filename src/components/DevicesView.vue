<template>
  <div class="devices-view">
    <div class="devices-heading">
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

    <div v-else class="devices-grid" aria-label="Device cards">
      <div v-if="cards.length" class="device-grid">
        <article
          v-for="card in cards"
          :key="card.id"
          class="device-card"
          :class="[{ 'is-heating': card.isActive }, card.kind]"
        >
          <component
            class="device-icon"
            :is="iconComponent(card.icon)"
            role="img"
            :aria-label="iconLabel(card.icon)"
          />

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
                <p class="label">Status</p>
                <p class="value">
                  <span class="heating-pill" :class="card.status.tone">
                    <span class="pulse" aria-hidden="true"></span>
                    {{ card.status.label }}
                  </span>
                </p>
              </div>
              <div
                v-for="(element, index) in card.elements"
                :key="`${card.id}-el-${index}`"
                class="stat"
                :class="{ interactive: Boolean(element.power) }"
              >
                <p class="label">{{ element.label }}</p>
                <p class="value">
                  <button
                    v-if="element.power"
                    class="stat-button"
                    type="button"
                    :aria-busy="isPowerLoading(element.power.key)"
                    :disabled="loading || isPowerLoading(element.power.key)"
                    @click="emit('toggle-power', element.power)"
                  >
                    <span class="heating-pill" :class="element.tone">
                      <span class="pulse" aria-hidden="true"></span>
                      <span v-if="isPowerLoading(element.power.key)">Updating…</span>
                      <span v-else>{{ element.value }}</span>
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
import type { Component } from 'vue';
import { toRefs } from 'vue';
import BulbIcon from '../assets/icons/bulb.svg?component';
import RadiatorIcon from '../assets/icons/radiator.svg?component';
import ThermostatIcon from '../assets/icons/thermostat.svg?component';
import type {
  DeviceCard,
  DeviceIcon,
  DeviceType,
  PowerControl,
} from '../composables/useDeviceCards';

const props = defineProps<{
  loading: boolean;
  errorMessage: string;
  cards: DeviceCard[];
  availableTypes: DeviceType[];
  selectedTypes: DeviceType[];
  powerLoadingKeys: Set<string>;
}>();

const emit = defineEmits<{
  (e: 'refresh'): void;
  (e: 'toggle-type', type: DeviceType): void;
  (e: 'select-all'): void;
  (e: 'toggle-power', control: PowerControl): void;
}>();

const { loading, errorMessage, cards, availableTypes, selectedTypes, powerLoadingKeys } =
  toRefs(props);

const iconMap: Record<DeviceIcon, Component> = {
  bulb: BulbIcon,
  radiator: RadiatorIcon,
  thermostat: ThermostatIcon,
};

function iconComponent(icon: DeviceIcon) {
  return iconMap[icon];
}

function iconLabel(icon: DeviceIcon) {
  if (icon === 'radiator') return 'Radiator icon';
  if (icon === 'thermostat') return 'Boiler icon';
  return 'Light bulb icon';
}

function isPowerLoading(key: string) {
  return powerLoadingKeys.value.has(key);
}

function formatTypeLabel(type: DeviceType) {
  if (type === 'bulb') return 'Bulb';
  if (type === 'radiator') return 'Radiator';
  return 'Thermostat';
}
</script>
