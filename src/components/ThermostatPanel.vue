<template>
  <ThermostatView
    :loading="loading"
    :error-message="errorMessage"
    :cards="filteredCards"
    :available-types="deviceTypes"
    :selected-types="selectedTypes"
    @refresh="refresh"
    @toggle-type="toggleType"
    @select-all="selectAll"
  />
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import ThermostatView from './ThermostatView.vue';
import { DEVICE_TYPES, useDeviceCards } from '../composables/useDeviceCards';
import type { DeviceType } from '../composables/useDeviceCards';

const { loading, errorMessage, cards, refresh } = useDeviceCards();
const deviceTypes = DEVICE_TYPES;
const selectedTypes = ref<DeviceType[]>([...DEVICE_TYPES]);

const filteredCards = computed(() =>
  cards.value.filter((card) => selectedTypes.value.includes(card.kind)),
);

function toggleType(type: DeviceType) {
  if (selectedTypes.value.includes(type)) {
    selectedTypes.value = selectedTypes.value.filter((t) => t !== type);
  } else {
    selectedTypes.value = [...selectedTypes.value, type];
  }
}

function selectAll() {
  selectedTypes.value = [...DEVICE_TYPES];
}

onMounted(() => {
  refresh();
});
</script>
