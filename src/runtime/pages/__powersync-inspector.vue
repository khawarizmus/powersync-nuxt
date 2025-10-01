<template>
  <div
    flex="~ justify-between"
    border="b"
    border-color="gray-100"
    py="3"
    mb="3"
  >
    <div flex="~ gap-2">
      <NTip
        :n="`${isConnected ? 'green' : isSyncing ? 'blue' : 'red'} xs`"
        :icon="`${
          isConnected
            ? 'carbon:plug-filled'
            : isSyncing
              ? 'carbon:plug'
              : 'carbon:connection-signal-off'
        }`"
      >
        Powersync is
        {{
          isConnected
            ? "connected"
            : isSyncing
              ? "connecting..."
              : "disconnected"
        }}
      </NTip>
      <NTip
        :n="`${isSyncing ? 'blue' : hasSynced ? 'green' : 'yellow'} xs`"
        :icon="`${
          isSyncing
            ? 'carbon:data-unreal'
            : hasSynced
              ? 'carbon:checkmark-filled'
              : 'carbon:async'
        }`"
      >
        {{ isSyncing ? "Syncing" : hasSynced ? "Synced" : "Not Synced" }}
      </NTip>
      <NTip
        :n="isUploading ? 'green' : 'gray' + ' xs'"
        :icon="isUploading ? 'carbon:cloud-upload' : 'carbon:pause-outline'"
      >
        {{ isUploading ? "Uploading" : "Upload Idle" }}
      </NTip>
      <NTip
        :n="isDownloading ? 'green' : 'gray' + ' xs'"
        :icon="isDownloading ? 'carbon:cloud-download' : 'carbon:pause-outline'"
      >
        {{ isDownloading ? "Downloading" : "Download Idle" }}
      </NTip>
      <NBadge
        flex="~ gap-2 items-center"
        n="gray xs"
        icon="carbon:server-time"
      >
        Last Synced:
        {{ lastSyncedFormatted }}
      </NBadge>
      <NBadge
        flex="~ gap-2 items-center"
        n="gray xs"
        icon="carbon:user-admin"
      >
        Logged in as: {{ userID }}
      </NBadge>
    </div>

    <div flex="~ gap-2">
      <NButton
        n="red sm"
        icon="carbon:clean"
        @click="clearData"
      >
        Prune & Re-sync
      </NButton>
      <NDarkToggle />
    </div>
  </div>

  <div flex="~ gap-4">
    <NTip
      v-if="downloadError || uploadError"
      n="red sm"
      mb="3"
      icon="carbon:warning-hex-filled"
    >
      {{ downloadError?.message ?? uploadError?.message }}
    </NTip>
  </div>

  <div
    flex="~ gap-2"
    mb="3"
  >
    <NSelectTabs
      v-model="selectedTab"
      n="amber6 dark:amber5"
      cursor="pointer"
      :options="tabs"
    />
  </div>

  <!-- switching tabs -->
  <SyncStatusTab v-if="selectedTab === 'health'" />
  <DataInspectorTab v-if="selectedTab === 'data'" />
  <ConfigInspectorTab v-if="selectedTab === 'config'" />
  <LogsTab v-if="selectedTab === 'logs'" />
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useTimeAgo } from '@vueuse/core'
import { definePageMeta, usePowerSyncInspectorDiagnostics } from '#imports'

definePageMeta({
  layout: 'powersync-inspector-layout',
})

const {
  db,
  isConnected,
  isSyncing,
  hasSynced,
  isDownloading,
  isUploading,
  downloadError,
  uploadError,
  lastSyncedAt,
  userID,
  clearData,
} = usePowerSyncInspectorDiagnostics()

onMounted(async () => {
  await db.value?.waitForFirstSync()
})

const selectedTab = ref('health')
const tabs = [
  { label: 'Sync Status', value: 'health' },
  { label: 'Data Inspector', value: 'data' },
  { label: 'Config Inspector', value: 'config' },
  { label: 'Logs', value: 'logs' },
]

const lastSyncedFormatted = computed(() =>
  useTimeAgo(new Date(lastSyncedAt.value)),
)
</script>
