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

    <div class="flex justify-between mb-3">
      <div class="flex gap-2">
        <NTip
          :n="`${isConnected ? 'green' : isSyncing ? 'blue' : 'red'} sm`"
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
          :n="`${isSyncing ? 'blue' : hasSynced ? 'green' : 'yellow'} sm`"
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
          :n="
            getFlowStatusColor(syncStatus?.dataFlowStatus.uploading ?? false) +
            ' sm'
          "
          :icon="
            syncStatus?.dataFlowStatus.uploading
              ? 'carbon:cloud-upload'
              : 'carbon:pause-outline'
          "
        >
          {{
            syncStatus?.dataFlowStatus.uploading ? "Uploading" : "Upload Idle"
          }}
        </NTip>
        <NTip
          :n="
            getFlowStatusColor(
              syncStatus?.dataFlowStatus.downloading ?? false
            ) + ' sm'
          "
          :icon="
            syncStatus?.dataFlowStatus.downloading
              ? 'carbon:cloud-download'
              : 'carbon:pause-outline'
          "
        >
          {{
            syncStatus?.dataFlowStatus.downloading
              ? "Downloading"
              : "Download Idle"
          }}
        </NTip>
        <NBadge class="flex items-center gap-2" icon="carbon:server-time">
          Last Synced:
          {{ useTimeAgo(new Date(lastSyncedAt ?? "")) }}
        </NBadge>
      </div>

      <div class="flex gap-2">
        <NButton @click="clearData">Clear Data</NButton>
        <NButton @click="logout">Logout</NButton>
      </div>
    </div>

    <div class="flex gap-4 mb-3">
      <NTip
        v-if="connector?.hasCredentials()"
        n="gray sm"
        icon="carbon:user-admin"
      >
        Logged in as: {{ userID }}
      </NTip>
      <NTip
        v-if="
          authenticated &&
          (syncStatus?.dataFlowStatus.downloadError ||
            syncStatus?.dataFlowStatus.uploadError)
        "
        n="red sm"
        icon="carbon:warning-hex-filled"
      >
        {{
          syncStatus?.dataFlowStatus.downloadError?.message ??
          syncStatus?.dataFlowStatus.uploadError?.message
        }}
      </NTip>
    </div>

    <div v-if="authenticated" class="flex gap-2 mb-3">
      <NSelectTabs
        v-model="selectedTab"
        n="amber6 dark:amber5 lg"
        :options="tabs"
      />
    </div>

    <slot />
  </div>
</template>

<script setup lang="ts">
import { useTimeAgo } from "@vueuse/core";

const { connector, clearData, signOut } = useConnectionManager();
const { syncStatus, isConnected, hasSynced, db, isSyncing, lastSyncedAt } =
  usePowerSyncAppDiagnostics();

const route = useRoute();
const authenticated = computed(() => route.name !== "index");

await db.value!.waitForFirstSync();

const selectedTab = ref("health");
const tabs = [
  { label: "Sync Status", value: "health" },
  { label: "Config Inspector", value: "config" },
];

watch(selectedTab, (value) => {
  navigateTo(`/${value}`);
});

const getFlowStatusColor = (status: boolean) => (status ? "green" : "gray");

async function logout() {
  await signOut();
  navigateTo("/");
}

const userID = computed(() => {
  try {
    const token = connector.value?.fetchCredentials()?.token;
    if (!token) return null;

    const [_head, body, _signature] = token.split(".");
    const payload = JSON.parse(atob(body ?? ""));
    return payload.sub;
  } catch {
    return null;
  }
});
</script>
