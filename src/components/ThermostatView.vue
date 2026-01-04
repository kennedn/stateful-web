<template>
  <div class="thermostat-view">
    <div class="thermostat-heading">
      <div>
        <p class="eyebrow">Thermostat mode</p>
        <h2>Home status overview</h2>
      </div>
      <button class="refresh" type="button" :disabled="loading" @click="emit('refresh')">
        {{ loading ? 'Loading…' : 'Refresh' }}
      </button>
    </div>

    <p class="helper-text">
      Live thermostat data pulled from the <code>radiator</code>, <code>bthome</code>, and
      <code>thermostat</code> endpoints.
    </p>

    <div v-if="errorMessage" class="callout error">{{ errorMessage }}</div>
    <div v-else-if="loading" class="callout">Loading thermostat data…</div>

    <div v-if="!loading && !errorMessage" class="thermostat-grid">
      <section class="panel">
        <header>
          <h3>Radiators</h3>
          <small>kitchen, living room, office, bedroom</small>
        </header>
        <div class="table" role="table" aria-label="Radiator status">
          <div class="table-row table-head" role="row">
            <span v-for="col in radiatorColumns" :key="col" role="columnheader">{{ col }}</span>
          </div>
          <div
            v-for="row in radiatorStatus"
            :key="row.id + row.name"
            class="table-row"
            role="row"
          >
            <span role="cell">{{ row.name }}</span>
            <span role="cell">{{ row.id }}</span>
            <span role="cell">{{ formatNumber(row.onoff) }}</span>
            <span role="cell">{{ formatNumber(row.mode) }}</span>
            <span role="cell">{{ formatNumber(row.current) }}</span>
            <span role="cell">{{ formatNumber(row.target) }}</span>
            <span role="cell">{{ formatBoolean(row.heating) }}</span>
            <span role="cell">{{ formatBoolean(row.openWindow) }}</span>
          </div>
          <div v-if="!radiatorStatus.length" class="table-empty">No radiator data.</div>
        </div>
      </section>

      <section class="panel">
        <header>
          <h3>Room sensors</h3>
          <small>bthome status</small>
        </header>
        <div class="table" role="table" aria-label="Room sensor status">
          <div class="table-row table-head" role="row">
            <span v-for="col in sensorColumns" :key="col" role="columnheader">{{ col }}</span>
          </div>
          <div
            v-for="row in bthomeStatus"
            :key="row.name + row.packet"
            class="table-row"
            role="row"
          >
            <span role="cell">{{ row.name }}</span>
            <span role="cell">{{ formatNumber(row.packet) }}</span>
            <span role="cell">{{ formatNumber(row.battery) }}</span>
            <span role="cell">{{ formatDecimal(row.temperature) }}</span>
            <span role="cell">{{ formatDecimal(row.humidity) }}</span>
            <span role="cell">{{ formatDecimal(row.voltage) }}</span>
          </div>
          <div v-if="!bthomeStatus.length" class="table-empty">No sensor data.</div>
        </div>
      </section>

      <section class="panel">
        <header>
          <h3>Thermostat</h3>
          <small>thermostat status</small>
        </header>
        <div class="table" role="table" aria-label="Thermostat status">
          <div class="table-row table-head" role="row">
            <span v-for="col in thermostatColumns" :key="col" role="columnheader">{{ col }}</span>
          </div>
          <div v-if="thermostatStatus" class="table-row" role="row">
            <span role="cell">{{ thermostatStatus.name }}</span>
            <span role="cell">{{ formatNumber(thermostatStatus.onoff) }}</span>
            <span role="cell">{{ formatNumber(thermostatStatus.mode) }}</span>
            <span role="cell">{{ formatNumber(thermostatStatus.current) }}</span>
            <span role="cell">{{ formatNumber(thermostatStatus.target) }}</span>
            <span role="cell">{{ formatBoolean(thermostatStatus.heating) }}</span>
            <span role="cell">{{ formatBoolean(thermostatStatus.openWindow) }}</span>
          </div>
          <div v-else class="table-empty">No thermostat data.</div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { toRefs } from 'vue';
import type {
  BthomeRow,
  RadiatorRow,
  ThermostatRow,
} from '../composables/useThermostatStatus';

const props = defineProps<{
  loading: boolean;
  errorMessage: string;
  radiatorStatus: RadiatorRow[];
  bthomeStatus: BthomeRow[];
  thermostatStatus: ThermostatRow | null;
}>();

const emit = defineEmits<{ (e: 'refresh'): void }>();

const { loading, errorMessage, radiatorStatus, bthomeStatus, thermostatStatus } = toRefs(props);

const radiatorColumns = [
  'NAME',
  'ID',
  'ONOFF',
  'MODE',
  'CURRENT',
  'TARGET',
  'HEATING',
  'OPEN_WINDOW',
];

const sensorColumns = [
  'NAME',
  'PACKET',
  'BATTERY',
  'TEMPERATURE',
  'HUMIDITY',
  'VOLTAGE',
];

const thermostatColumns = [
  'NAME',
  'ONOFF',
  'MODE',
  'CURRENT',
  'TARGET',
  'HEATING',
  'OPEN_WINDOW',
];

function formatBoolean(value: boolean | null) {
  if (value === null || value === undefined) return '—';
  return value ? 'TRUE' : 'FALSE';
}

function formatNumber(value: number | null) {
  if (value === null || value === undefined) return '—';
  return value;
}

function formatDecimal(value: number | null) {
  if (value === null || value === undefined) return '—';
  return Number(value).toFixed(2);
}
</script>
