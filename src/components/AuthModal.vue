<template>
  <div v-if="open" class="auth-backdrop" role="dialog" aria-modal="true">
    <div class="auth-modal">
      <div class="auth-modal__header">
        <h3>Authentication required</h3>
        <button
          type="button"
          class="auth-modal__close"
          aria-label="Close authentication dialog"
          @click="emit('close')"
        >
          ×
        </button>
      </div>
      <p class="auth-modal__body">
        Please enter your username and password to continue.
      </p>
      <form class="auth-modal__form" autocomplete="on" @submit.prevent="submit">
        <label>
          <span>Username</span>
          <input
            v-model="localUsername"
            type="text"
            autocomplete="username"
            placeholder="username"
            required
          />
        </label>
        <label>
          <span>Password</span>
          <input
            v-model="localPassword"
            type="password"
            autocomplete="current-password"
            placeholder="password"
            required
          />
        </label>
        <div class="auth-modal__actions">
          <button type="button" class="ghost" @click="emit('close')">Cancel</button>
          <button type="submit">Login</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
  open: boolean;
  username: string;
  password: string;
}>();

const emit = defineEmits<{
  (e: 'submit', payload: { username: string; password: string }): void;
  (e: 'close'): void;
}>();

const localUsername = ref(props.username);
const localPassword = ref(props.password);

watch(
  () => props.username,
  (value) => {
    localUsername.value = value;
  },
);

watch(
  () => props.password,
  (value) => {
    localPassword.value = value;
  },
);

function submit() {
  emit('submit', {
    username: localUsername.value,
    password: localPassword.value,
  });
}
</script>
