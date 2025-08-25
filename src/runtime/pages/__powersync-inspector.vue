<template>
  <div
    flex="~ relative col"
    p="6"
    h="screen"
    n-bg="base"
    class="ps-inspector-ui"
  >
    <h1 flex="~ gap-2 items-center" mb="3" text="3xl" font="bold">
      <img
        src="https://cdn.prod.website-files.com/67eea61902e19994e7054ea0/67f910109a12edc930f8ffb6_powersync-icon.svg"
        alt="Powersync"
        w="10"
        h="10"
      />
      Powersync Inspector
    </h1>

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
          :n="getFlowStatusColor(isUploading) + ' xs'"
          :icon="isUploading ? 'carbon:cloud-upload' : 'carbon:pause-outline'"
        >
          {{ isUploading ? "Uploading" : "Upload Idle" }}
        </NTip>
        <NTip
          :n="getFlowStatusColor(isDownloading) + ' xs'"
          :icon="
            isDownloading ? 'carbon:cloud-download' : 'carbon:pause-outline'
          "
        >
          {{ isDownloading ? "Downloading" : "Download Idle" }}
        </NTip>
        <NBadge
          flex="~ gap-2 items-center"
          n="gray xs"
          icon="carbon:server-time"
        >
          Last Synced:
          {{ useTimeAgo(new Date(lastSyncedAt)) }}
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
        <NButton n="red sm" icon="carbon:clean" @click="clearData"
          >Prune & Re-sync</NButton
        >
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

    <div flex="~ gap-2" mb="3">
      <NSelectTabs
        v-model="selectedTab"
        n="amber6 dark:amber5"
        cursor="pointer"
        :options="tabs"
      />
    </div>

    <div
      border="t"
      border-color="gray-100"
      relative
      n-bg="base"
      flex="~ col"
      h="screen"
    >
      <div flex="~ col gap-2">
        <NSectionBlock icon="carbon:data-share" text="Data Flow">
          <div grid="~ cols-6 gap-4" mb="4">
            <!-- Download Progress -->
            <div flex="~ col gap-2">
              <span text="sm gray-500">Download Progress</span>
              <div flex="~ items-center gap-2">
                <template v-if="downloadProgressDetails !== null">
                  <div flex="1" bg="gray-200" rounded="full" h="2">
                    <div
                      bg="blue-600"
                      h="2"
                      rounded="full"
                      transition="all"
                      duration="300"
                      :style="{
                        width: `${totalDownloadProgress}%`,
                      }"
                    ></div>
                  </div>
                  <span text="sm" font="medium"
                    >{{ totalDownloadProgress }}%</span
                  >
                </template>
                <template v-else>
                  <span text="sm gray-400">No active download</span>
                </template>
              </div>
            </div>

            <!-- Error Indicator -->
            <div flex="~ col gap-2">
              <span text="sm gray-500">Status</span>
              <NBadge
                :n="downloadError ? 'red' : 'green'"
                :icon="
                  downloadError
                    ? 'carbon:warning-filled'
                    : 'carbon:checkmark-filled'
                "
              >
                {{ downloadError ? "Error" : "Healthy" }}
              </NBadge>
            </div>

            <!-- Error Details -->
            <div flex="~ col gap-2" col="span-4">
              <span text="sm gray-500">Error Message</span>
              <NBadge
                v-if="downloadError"
                n="red sm"
                icon="carbon:warning-filled"
              >
                {{ downloadError.message }}
              </NBadge>
              <NBadge v-else n="slate sm" icon="carbon:checkmark-filled">
                N/A
              </NBadge>
            </div>
          </div>

          <div grid="~ cols-6 gap-4" mb="4">
            <!-- Upload Progress -->
            <div flex="~ col gap-2">
              <span text="sm gray-500">Upload Progress</span>
              <div flex="~ items-center gap-2">
                <span v-if="syncStatus?.dataFlowStatus.uploading"
                  >upload in progress...</span
                >
                <span v-else text="sm gray-400">No active upload</span>
              </div>
            </div>

            <!-- Error Indicator -->
            <div flex="~ col gap-2">
              <span text="sm gray-500">Status</span>
              <NBadge
                :n="uploadError ? 'red' : 'green'"
                :icon="
                  uploadError
                    ? 'carbon:warning-filled'
                    : 'carbon:checkmark-filled'
                "
              >
                {{ uploadError ? "Error" : "Healthy" }}
              </NBadge>
            </div>

            <div flex="~ col gap-2">
              <span text="sm gray-500">Upload Queue Count</span>
              <span text="sm"> {{ uploadQueueStats?.count ?? 0 }} </span>
            </div>

            <div flex="~ col gap-2">
              <span text="sm gray-500">Upload Queue Size</span>
              <span text="sm">
                {{ formatBytes(uploadQueueStats?.size ?? 0) }}
              </span>
            </div>

            <!-- Error Details -->
            <div flex="~ col gap-2" col="span-2">
              <span text="sm gray-500">Error Message</span>
              <NBadge
                v-if="uploadError"
                n="red sm"
                icon="carbon:warning-filled"
              >
                {{ uploadError.message }}
              </NBadge>
              <NBadge v-else n="slate sm" icon="carbon:checkmark-filled">
                N/A
              </NBadge>
            </div>
          </div>
        </NSectionBlock>

        <span border="b" border-color="gray-100"></span>

        <NSectionBlock icon="carbon:data-volume" text="Data Size">
          <div grid="~ cols-5 gap-4" mb="4">
            <div flex="~ col gap-2">
              <span text="sm gray-500">Buckets Synced</span>
              <span text="sm"> {{ totals.buckets }} </span>
            </div>

            <div flex="~ col gap-2">
              <span text="sm gray-500">Rows Synced</span>
              <span text="sm"> {{ totals.row_count }} </span>
            </div>

            <div flex="~ col gap-2">
              <span text="sm gray-500">Data size</span>
              <span text="sm">
                {{ totals.data_size }}
              </span>
            </div>

            <div flex="~ col gap-2">
              <span text="sm gray-500">Metadata size</span>
              <span text="sm">
                {{ totals.metadata_size }}
              </span>
            </div>

            <div flex="~ col gap-2">
              <span text="sm gray-500">Download size</span>
              <span text="sm">
                {{ totals.download_size }}
              </span>
            </div>
          </div>
        </NSectionBlock>

        <span border="b" border-color="gray-100"></span>

        <NSectionBlock icon="carbon:data-share" text="Operations">
          <div grid="~ cols-2 gap-4" mb="4">
            <div flex="~ col gap-2">
              <span text="sm gray-500">Total operations</span>
              <span text="sm">
                {{ totals.total_operations }}
              </span>
            </div>

            <div flex="~ col gap-2">
              <span text="sm gray-500">Downloaded operations</span>
              <span text="sm">
                {{ totals.downloaded_operations }}
              </span>
            </div>
          </div>
        </NSectionBlock>

        <span border="b" border-color="gray-100"></span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// import { useStatus, usePowerSync } from "@powersync/vue";
import { useTimeAgo } from "@vueuse/core";

definePageMeta({
  layout: "__powersync-inspector-layout", // this is necessary so that we don't use the main app layout
});

const {
  db,
  syncStatus,
  isConnected,
  isSyncing,
  hasSynced,
  isDownloading,
  isUploading,
  downloadError,
  uploadError,
  downloadProgressDetails,
  lastSyncedAt,
  totalDownloadProgress,
  uploadQueueStats,
  totals,
  userID,
  clearData,
  formatBytes,
} = usePowerSyncInspectorDiagnostics();

onMounted(async () => {
  await db.value?.waitForFirstSync();
});

const selectedTab = ref("health");
const tabs = [
  { label: "Sync Status", value: "health" },
  { label: "Data Inspector", value: "data" },
  { label: "Config Inspector", value: "config" },
  { label: "Logs", value: "logs" },
];

watch(selectedTab, (value) => {
  // change tab
});

const getFlowStatusColor = (status: boolean) => (status ? "green" : "gray");
</script>
