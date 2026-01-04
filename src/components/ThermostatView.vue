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

    <div v-if="!loading && !errorMessage" class="thermostat-grid">
      <section class="panel">
        <header>
          <h3>Radiators</h3>
          <small>Kitchen, Living room, Office, Bedroom</small>
        </header>
        <p class="helper-text">
          Each radiator card shows live target and room temperatures alongside the paired
          BTHome sensor.
        </p>

        <div v-if="radiatorCards.length" class="device-grid" aria-label="Radiator status">
          <article
            v-for="card in radiatorCards"
            :key="card.id + card.name"
            class="device-card radiator-card"
            :class="{ 'is-heating': card.heating }"
          >
            <div class="device-illustration radiator-graphic" aria-hidden="true">
              <span class="radiator-bar"></span>
              <span class="radiator-bar"></span>
              <span class="radiator-bar"></span>
              <span class="radiator-bar"></span>
              <span class="radiator-base"></span>
            </div>

            <div class="device-body">
              <div class="device-heading">
                <div>
                  <p class="eyebrow">Radiator</p>
                  <h4>{{ card.name }}</h4>
                </div>
                <small class="device-id">ID: {{ card.id || '—' }}</small>
              </div>

              <div class="stat-grid">
                <div class="stat">
                  <p class="label">Room temp</p>
                  <p class="value">{{ formatTemperature(card.current) }}</p>
                </div>
                <div class="stat">
                  <p class="label">Target</p>
                  <p class="value">{{ formatTemperature(card.target) }}</p>
                </div>
                <div class="stat">
                  <p class="label">BTHome</p>
                  <p class="value">{{ formatTemperature(card.sensorTemperature) }}</p>
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
        <div v-else class="table-empty">No radiator data.</div>
      </section>

      <section class="panel">
        <header>
          <h3>Thermostat</h3>
          <small>Boiler and call for heat</small>
        </header>
        <p class="helper-text">
          The main thermostat aggregates boiler demand and current set point.
        </p>

        <article
          v-if="thermostatStatus"
          class="device-card thermostat-card"
          :class="{ 'is-heating': thermostatStatus.heating }"
          aria-label="Thermostat status"
        >
          <div class="device-illustration boiler-graphic" aria-hidden="true">
            <span class="boiler-body"></span>
            <span class="boiler-gauge"></span>
          </div>

          <div class="device-body">
            <div class="device-heading">
              <div>
                <p class="eyebrow">Thermostat</p>
                <h4>{{ thermostatStatus.name }}</h4>
              </div>
              <small class="device-id">Mode: {{ formatNumber(thermostatStatus.mode) }}</small>
            </div>

            <div class="stat-grid">
              <div class="stat">
                <p class="label">Temperature</p>
                <p class="value">{{ formatTemperature(thermostatStatus.current) }}</p>
              </div>
              <div class="stat">
                <p class="label">Target</p>
                <p class="value">{{ formatTemperature(thermostatStatus.target) }}</p>
              </div>
              <div class="stat">
                <p class="label">Heating</p>
                <p class="value">
                  <span class="heating-pill" :class="heatingClass(thermostatStatus.heating)">
                    <span class="pulse" aria-hidden="true"></span>
                    {{ formatHeating(thermostatStatus.heating) }}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </article>
        <div v-else class="table-empty">No thermostat data.</div>
      </section>
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

function formatNumber(value: number | null) {
  if (value === null || value === undefined) return '—';
  return value;
}

function formatTemperature(value: number | null) {
  if (value === null || value === undefined) return '—';
  return `${Number(value).toFixed(1)}°C`;
}

function formatHeating(value: boolean | null) {
  if (value === null || value === undefined) return 'Unknown';
  return value ? 'Heating' : 'Idle';
}

function heatingClass(value: boolean | null) {
  if (value === null || value === undefined) return 'unknown';
  return value ? 'on' : 'off';
}
</script>
