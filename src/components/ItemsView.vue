<template>
  <div class="items" :class="{ error: !!errorMessage }">
    <template v-if="loading && !errorMessage">
      Loading…
    </template>

    <template v-else-if="errorMessage">
      {{ errorMessage }}
    </template>

    <template v-else-if="!items.length">
      No items.
    </template>

    <!-- Range mode -->
    <template v-else-if="rangeInfo.isRange">
      <!-- main range row -->
      <div class="row" @click="onRangeRowClick">
        <div class="row-inner">
          <span class="range-label">Code (0–100)</span>
          <input
            type="number"
            min="0"
            max="100"
            step="1"
            class="range-code-input"
            :value="rangeCode"
            @click.stop
            @input="onRangeCodeInput"
          />
          <span class="item-btn">POST</span>
        </div>
      </div>

      <div
        v-for="extra in rangeInfo.extras"
        :key="extra"
        class="row"
        @click="onPostRowClick(extra, $event)"
      >
        <div class="row-inner">
          <span class="item-label">{{ extra }}</span>
          <span class="item-btn">POST</span>
        </div>
      </div>
    </template>

    <!-- Normal mode -->
    <template v-else>
      <div
        v-for="item in items"
        :key="item"
        class="row"
        @click="onItemRowClick(item, $event)"
      >
        <div class="row-inner">
          <span class="item-label">{{ item }}</span>
          <span class="item-btn">
            {{ childInfo[item]?.hasChildren ? 'GET' : 'POST' }}
          </span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ComputedRef, Ref } from 'vue';

const props = defineProps<{
  items: string[];
  loading: boolean;
  errorMessage: string;
  rangeInfo: { isRange: boolean; extras: string[] };
  rangeCode: number;
  rangeWithValue: boolean;
  rangeValue: string;
  childInfo: Record<string, { hasChildren: boolean; list: string[] | null }>;
  currentPath: string[];
}>();

const emit = defineEmits<{
  (e: 'update:rangeCode', v: number): void;
  (e: 'update:rangeWithValue', v: boolean): void;
  (e: 'update:rangeValue', v: string): void;
  (e: 'post', path: string[], code: string, extra: string | null): void;
  (e: 'navigate', path: string[], knownItems: string[] | null): void;
  (e: 'setRowBackground', ev: Event): void;
}>();

function onRangeCodeInput(e: Event) {
  const v = Number((e.target as HTMLInputElement).value);
  emit('update:rangeCode', v);
}

function onRangeWithValueChange(e: Event) {
  const checked = (e.target as HTMLInputElement).checked;
  emit('update:rangeWithValue', checked);
}

function onRangeValueInput(e: Event) {
  emit('update:rangeValue', (e.target as HTMLInputElement).value);
}

function onRangeRowClick(e: Event) {
  emit('setRowBackground', e);
  const n = Number(props.rangeCode);
  if (!Number.isInteger(n) || n < 0 || n > 100) {
    emit(
      'post',
      props.currentPath,
      'Validation',
      'Code must be an integer 0–100',
    );
    return;
  }
  const extraValue = props.rangeWithValue ? props.rangeValue : null;
  emit('post', props.currentPath, String(n), extraValue);
}


function onPostRowClick(code: string, e: Event) {
  emit('setRowBackground', e);
  const isStatus = String(code).toLowerCase() === 'status';
  emit('post', props.currentPath, code, null);
}

function onItemRowClick(item: string, e: Event) {
  const info = props.childInfo[item];
  const isStatus = String(item).toLowerCase() === 'status';

  if (info && info.hasChildren) {
    emit('setRowBackground', e);
    emit('navigate', [...props.currentPath, item], info.list);
  } else {
    onPostRowClick(item, e);
  }
}
</script>

