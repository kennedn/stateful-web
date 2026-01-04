<template>
  <div class="thermostat-view">
    <div class="thermostat-heading">
      <div>
        <h2>Home heating overview</h2>
      </div>
      <button class="refresh" type="button" :disabled="loading" @click="emit('refresh')">
        {{ loading ? 'Loading…' : 'Refresh' }}
      </button>
    </div>

    <div v-if="errorMessage" class="callout error">{{ errorMessage }}</div>
    <div v-else-if="loading" class="callout">Loading thermostat data…</div>

    <div v-else class="thermostat-grid" aria-label="Heating devices">
      <div v-if="deviceCards.length" class="device-grid">
        <article
          v-for="card in deviceCards"
          :key="card.kind === 'radiator' ? `${card.id}-${card.name}` : `thermostat-${card.name}`"
          class="device-card"
          :class="[{ 'is-heating': card.heating }, card.kind]"
        >
          <div class="device-icon" :class="card.kind" aria-hidden="true">
            <svg
              v-if="isRadiator(card)"
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
              v-else
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
          </div>

          <div class="device-body">
            <div class="device-heading">
              <div>
                <p class="eyebrow">{{ isRadiator(card) ? 'Radiator' : 'Thermostat' }}</p>
                <h4>{{ card.name }}</h4>
              </div>
              <small class="device-meta">
                {{ isRadiator(card) ? `ID: ${card.id || '—'}` : `Mode: ${formatNumber(card.mode)}` }}
              </small>
            </div>

            <div class="stat-grid">
              <div class="stat">
                <p class="label">{{ isRadiator(card) ? 'Room temp' : 'Temperature' }}</p>
                <p class="value">{{ formatTemperature(card.current) }}</p>
              </div>
              <div class="stat">
                <p class="label">Target</p>
                <p class="value">{{ formatTemperature(card.target) }}</p>
              </div>
              <div v-if="isRadiator(card)" class="stat">
                <p class="label">BTHome</p>
                <p class="value">{{ formatBtHomeTemperature(card.sensorTemperature) }}</p>
              </div>
              <div v-else class="stat">
                <p class="label">BTHome</p>
                <p class="value">{{ formatBtHomeTemperature(card.sensorTemperature) }}</p>
              </div>
              <div class="stat">
                <p class="label">Heating</p>
                <p class="value">
                  <span class="heating-pill" :class="heatingClass(card.heating)">
                    <span class="pulse" aria-hidden="true"></span>
                    {{ formatHeating(card.heating) }}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </article>
      </div>

      <div v-else class="table-empty">No thermostat data.</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, toRefs } from 'vue';
import type {
  BthomeRow,
  RadiatorRow,
  ThermostatRow,
} from '../composables/useThermostatStatus';

type RadiatorCard = RadiatorRow & { sensorTemperature: number | null };
type DeviceCard = (RadiatorCard & { kind: 'radiator' }) | (ThermostatRow & { kind: 'thermostat' });

const props = defineProps<{
  loading: boolean;
  errorMessage: string;
  radiatorStatus: RadiatorRow[];
  bthomeStatus: BthomeRow[];
  thermostatStatus: ThermostatRow | null;
}>();

const emit = defineEmits<{ (e: 'refresh'): void }>();

const { loading, errorMessage, radiatorStatus, bthomeStatus, thermostatStatus } = toRefs(props);

const bthomeByName = computed(() => {
  const mapping = new Map<string, number | null>();
  bthomeStatus.value.forEach((row) => {
    mapping.set(row.name, row.temperature ?? null);
  });
  return mapping;
});

const radiatorCards = computed<RadiatorCard[]>(() =>
  radiatorStatus.value.map((radiator) => ({
    ...radiator,
    sensorTemperature: bthomeByName.value.get(radiator.name) ?? null,
  })),
);

const deviceCards = computed<DeviceCard[]>(() => {
  const devices: DeviceCard[] = radiatorCards.value.map((radiator) => ({
    ...radiator,
    kind: 'radiator',
  }));

  if (thermostatStatus.value) {
    devices.unshift({ ...thermostatStatus.value, kind: 'thermostat' });
  }

  return devices;
});

function formatNumber(value: number | null) {
  if (value === null || value === undefined) return '—';
  return value;
}

function formatTemperature(value: number | null) {
  if (value === null || value === undefined) return '—';
  const celsius = Number(value) / 10;
  return `${celsius.toFixed(2)}°C`;
}

function formatBtHomeTemperature(value: number | null) {
  if (value === null || value === undefined) return '—';
  const celsius = Number(value);
  return `${celsius.toFixed(2)}°C`;
}

function formatHeating(value: boolean | null) {
  if (value === null || value === undefined) return 'Unknown';
  return value ? 'Heating' : 'Idle';
}

function heatingClass(value: boolean | null) {
  if (value === null || value === undefined) return 'unknown';
  return value ? 'on' : 'off';
}

function isRadiator(card: DeviceCard): card is RadiatorCard & { kind: 'radiator' } {
  return card.kind === 'radiator';
}
</script>
