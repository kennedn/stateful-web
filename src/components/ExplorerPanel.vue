<template>
  <div id="terminal-panel">
    <div
      id="terminal-handle"
      @mousedown.prevent="$emit('drag-mouse-down', $event)"
      @touchstart.passive="$emit('drag-touch-start', $event)"
    >
      <div id="terminal-handle-bar"></div>
    </div>

    <div id="terminal-body">
      <div class="terminal-header">
        <div id="status">{{ status }}</div>
      </div>

      <pre id="response">{{ response }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  status: string;
  response: string;
}>();

defineEmits<{
  (e: 'drag-mouse-down', ev: MouseEvent): void;
  (e: 'drag-touch-start', ev: TouchEvent): void;
}>();
</script>

