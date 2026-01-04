<template>
  <div>
    <div class="app">
      <div class="header">
        <h1>Stateful</h1>
      </div>

      <main class="main">
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
      </main>
    </div>

    <ExplorerPanel
      :status="statusLabel"
      :response="responseText"
      :showAuth="showAuthPanel"
      :username="authUsername"
      :password="authPassword"
      @drag-mouse-down="handleHandleMouseDown"
      @drag-touch-start="handleHandleTouchStart"
      @update:username="authUsername = $event"
      @update:password="authPassword = $event"
      @submit-auth="handleAuthSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { useApiExplorer } from './composables/useApiExplorer';
import PathBreadcrumb from './components/PathBreadcrumb.vue';
import ItemsView from './components/ItemsView.vue';
import ExplorerPanel from './components/ExplorerPanel.vue';

const {
  currentPathSegments,
  items,
  loading,
  errorMessage,
  statusLabel,
  responseText,
  authUsername,
  authPassword,
  rangeInfo,
  rangeCode,
  rangeWithValue,
  rangeValue,
  childInfo,
  showAuthPanel,
  navigateTo,
  postCode,
  handleAuthSubmit,
  setRowBackgroundFromEvent,
  handleHandleMouseDown,
  handleHandleTouchStart,
} = useApiExplorer();
</script>

