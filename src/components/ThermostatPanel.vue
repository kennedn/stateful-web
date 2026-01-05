<template>
  <ThermostatView
    :loading="loading"
    :error-message="errorMessage"
    :radiator-status="radiatorStatus"
    :bthome-status="bthomeStatus"
    :thermostat-status="thermostatStatus"
    @refresh="refresh"
  />
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useThermostatStatus } from '../composables/useThermostatStatus';
import ThermostatView from './ThermostatView.vue';

const {
  loading,
  errorMessage,
  radiatorStatus,
  bthomeStatus,
  thermostatStatus,
  refresh,
} = useThermostatStatus();

onMounted(() => {
  refresh();
});
</script>
