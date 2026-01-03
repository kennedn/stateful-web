<template>
  <div>
    <button @click="$emit('navigateRoot')">/v2</button>
    <template v-for="(seg, idx) in segments" :key="idx">
      <span>/</span>
      <template v-if="idx === segments.length - 1">
        <span>{{ seg }}</span>
      </template>
      <template v-else>
        <button @click="$emit('navigateTo', segments.slice(0, idx + 1))">
          {{ seg }}
        </button>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  segments: string[];
}>();

defineEmits<{
  (e: 'navigateRoot'): void;
  (e: 'navigateTo', path: string[]): void;
}>();
</script>

