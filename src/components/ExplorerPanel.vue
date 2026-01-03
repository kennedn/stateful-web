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

        <form
          v-if="showAuth"
          class="terminal-auth"
          autocomplete="on"
          @submit.prevent="$emit('submit-auth')"
        >
          <label>
            <span class="terminal-auth-label">User</span>
            <input
              type="text"
              autocomplete="username"
              placeholder="username"
              :value="username"
              @input="$emit('update:username', ($event.target as HTMLInputElement).value)"
            />
          </label>
          <label>
            <span class="terminal-auth-label">Pass</span>
            <input
              type="password"
              autocomplete="current-password"
              placeholder="password"
              :value="password"
              @input="$emit('update:password', ($event.target as HTMLInputElement).value)"
            />
          </label>
          <button type="submit">Login</button>
        </form>
      </div>

      <pre id="response">{{ response }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  status: string;
  response: string;
  showAuth: boolean;
  username: string;
  password: string;
}>();

defineEmits<{
  (e: 'drag-mouse-down', ev: MouseEvent): void;
  (e: 'drag-touch-start', ev: TouchEvent): void;
  (e: 'update:username', v: string): void;
  (e: 'update:password', v: string): void;
  (e: 'submit-auth'): void;
}>();
</script>

