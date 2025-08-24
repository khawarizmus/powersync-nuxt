<template>
  <div class="relative p-6 n-bg-base flex flex-col h-screen">
    <h1 class="text-3xl font-bold flex items-center gap-2 mb-3">
      <img
        src="https://cdn.prod.website-files.com/67eea61902e19994e7054ea0/67f910109a12edc930f8ffb6_powersync-icon.svg"
        alt="Powersync"
        class="w-10 h-10"
      />
      Powersync Inspector
    </h1>

    {{ sync?.syncStatus }}

    <div v-if="authenticated" class="flex justify-between mb-3">
      <div class="flex gap-2">
        <NTip
          :n="`${
            sync?.syncStatus.connected
              ? 'green'
              : sync?.syncStatus.connecting
              ? 'blue'
              : 'red'
          } sm`"
          :icon="`${
            sync?.syncStatus.connected
              ? 'carbon:plug-filled'
              : sync?.syncStatus.connecting
              ? 'carbon:plug'
              : 'carbon:connection-signal-off'
          }`"
        >
          Powersync is
          {{
            sync?.syncStatus.connected
              ? "connected"
              : sync?.syncStatus.connecting
              ? "connecting..."
              : "disconnected"
          }}
        </NTip>
        <NTip
          :n="`${syncing ? 'blue' : hasSynced ? 'green' : 'yellow'} sm`"
          :icon="`${
            syncing
              ? 'carbon:data-unreal'
              : hasSynced
              ? 'carbon:checkmark-filled'
              : 'carbon:async'
          }`"
        >
          {{ syncing ? "Syncing" : hasSynced ? "Synced" : "Not Synced" }}
        </NTip>
        <NTip
          :n="
            getFlowStatusColor(
              sync?.syncStatus.dataFlowStatus.uploading ?? false
            ) + ' sm'
          "
          :icon="
            sync?.syncStatus.dataFlowStatus.uploading
              ? 'carbon:cloud-upload'
              : 'carbon:pause-outline'
          "
        >
          {{
            sync?.syncStatus.dataFlowStatus.uploading
              ? "Uploading"
              : "Upload Idle"
          }}
        </NTip>
        <NTip
          :n="
            getFlowStatusColor(
              sync?.syncStatus.dataFlowStatus.downloading ?? false
            ) + ' sm'
          "
          :icon="
            sync?.syncStatus.dataFlowStatus.downloading
              ? 'carbon:cloud-download'
              : 'carbon:pause-outline'
          "
        >
          {{
            sync?.syncStatus.dataFlowStatus.downloading
              ? "Downloading"
              : "Download Idle"
          }}
        </NTip>
        <NBadge class="flex items-center gap-2" icon="carbon:server-time">
          Last Synced:
          {{ useTimeAgo(new Date(sync!.syncStatus.lastSyncedAt ?? "")) }}
        </NBadge>
      </div>

      <div class="flex gap-2">
        <NButton @click="clearData">Clear Data</NButton>
        <NButton @click="logout">Logout</NButton>
      </div>
    </div>

    <NTip
      v-if="
        authenticated &&
        (sync?.syncStatus.dataFlowStatus.downloadError ||
          sync?.syncStatus.dataFlowStatus.uploadError)
      "
      n="red sm"
      icon="carbon:warning-hex-filled"
    >
      {{
        sync?.syncStatus.dataFlowStatus.downloadError?.message ??
        sync?.syncStatus.dataFlowStatus.uploadError?.message
      }}
    </NTip>

    <div v-if="authenticated" class="flex gap-2 mb-3">
      <NSelectTabs
        n="amber6 dark:amber5 sm"
        :model-value="selectedTab"
        :options="tabs"
      />
    </div>

    <slot />
  </div>
</template>

<script setup lang="ts">
import { useTimeAgo } from "@vueuse/core";
const { sync, db, clearData, signOut } = useConnectionManager();

const route = useRoute();
const authenticated = computed(() => route.name !== "index");

if (authenticated.value && !sync.value?.syncStatus.hasSynced) {
  await db.value!.waitForFirstSync();
}

const selectedTab = ref("health");
const tabs = [
  { label: "Sync Status", value: "health" },
  { label: "Schema", value: "schema" },
];

watch(selectedTab, (value) => {
  navigateTo(`/${value}`);
});

const getFlowStatusColor = (status: boolean) => (status ? "green" : "gray");

async function logout() {
  await signOut();
  navigateTo("/");
}
const hasSynced = ref(false);
const syncing = ref(false);

watch(
  () => sync.value?.syncStatus,
  (value) => {
    if (value?.hasSynced) {
      hasSynced.value = true;
    }

    if (value?.dataFlowStatus.downloading || value?.dataFlowStatus.uploading) {
      syncing.value = true;
    } else {
      syncing.value = false;
    }

    if (
      value?.hasSynced === undefined ||
      (value?.priorityStatusEntries?.length &&
        value.priorityStatusEntries.length > 0)
    ) {
      hasSynced.value =
        value?.priorityStatusEntries.every((entry) => entry.hasSynced) ?? false;
    }
  }
);
</script>
