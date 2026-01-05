<template>
  <DevicesView
    :loading="loading"
    :error-message="errorMessage"
    :cards="filteredCards"
    :available-types="deviceTypes"
    :selected-types="selectedTypes"
    :power-loading-keys="powerLoading"
    @refresh="refresh"
    @toggle-type="toggleType"
    @select-all="selectAll"
    @toggle-power="togglePower"
  />
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import DevicesView from './DevicesView.vue';
import { DEVICE_TYPES, useDeviceCards } from '../composables/useDeviceCards';
import type { DeviceType, PowerControl } from '../composables/useDeviceCards';

const { loading, errorMessage, cards, powerLoading, togglePower: setPowerState, refresh } =
  useDeviceCards();
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

function togglePower(control: PowerControl) {
  setPowerState(control);
}

onMounted(() => {
  refresh();
});
</script>
