<template>
  <div class="stateful-view">
    <PathBreadcrumb
      class="path"
      :segments="currentPathSegments"
      @navigateRoot="navigateTo([], null, true)"
      @navigateTo="(segPath) => navigateTo(segPath, null, true)"
    />

    <ItemsView
      :items="items"
      :loading="loading"
      :error-message="errorMessage"
      :range-info="rangeInfo"
      :range-code="rangeCode"
      :range-with-value="rangeWithValue"
      :range-value="rangeValue"
      :child-info="childInfo"
      :current-path="currentPathSegments"
      @update:rangeCode="rangeCode = $event"
      @update:rangeWithValue="rangeWithValue = $event"
      @update:rangeValue="rangeValue = $event"
      @post="postCode"
      @navigate="navigateTo"
      @setRowBackground="setRowBackgroundFromEvent"
    />

    <ExplorerPanel
      :status="statusLabel"
      :response="responseText"
      @drag-mouse-down="handleHandleMouseDown"
      @drag-touch-start="handleHandleTouchStart"
    />
  </div>
</template>

<script setup lang="ts">
import ExplorerPanel from './ExplorerPanel.vue';
import ItemsView from './ItemsView.vue';
import PathBreadcrumb from './PathBreadcrumb.vue';
import { useApiExplorer } from '../composables/useApiExplorer';

const {
  currentPathSegments,
  items,
  loading,
  errorMessage,
  statusLabel,
  responseText,
  rangeInfo,
  rangeCode,
  rangeWithValue,
  rangeValue,
  childInfo,
  navigateTo,
  postCode,
  setRowBackgroundFromEvent,
  handleHandleMouseDown,
  handleHandleTouchStart,
} = useApiExplorer();
</script>
