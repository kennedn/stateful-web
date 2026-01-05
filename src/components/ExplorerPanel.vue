<template>
  <div id="terminal-panel">
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
</script>

