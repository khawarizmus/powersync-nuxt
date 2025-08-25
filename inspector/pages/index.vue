<template>
  <div class="relative n-bg-base flex flex-col h-screen">
    <div v-if="client" class="flex flex-col gap-2">
      <NSectionBlock icon="carbon:data-share" text="Data Flow">
        <div class="grid grid-cols-6 gap-4 mb-4">
          <!-- Download Progress -->
          <div class="flex flex-col gap-2">
            <span class="text-sm text-gray-500">Download Progress</span>
            <div class="flex items-center gap-2">
              <template
                v-if="syncStatus?.dataFlowStatus.downloadProgress !== null"
              >
                <div class="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    :style="{
                      width: `${totalDownloadProgress}%`,
                    }"
                  ></div>
                </div>
                <span class="text-sm font-medium"
                  >{{ totalDownloadProgress }}%</span
                >
              </template>
              <template v-else>
                <span class="text-sm text-gray-400">No active download</span>
              </template>
            </div>
          </div>

          <!-- Error Indicator -->
          <div class="flex flex-col gap-2">
            <span class="text-sm text-gray-500">Status</span>
            <NBadge
              :n="syncStatus?.dataFlowStatus.downloadError ? 'red' : 'green'"
              :icon="
                syncStatus?.dataFlowStatus.downloadError
                  ? 'carbon:warning-filled'
                  : 'carbon:checkmark-filled'
              "
            >
              {{
                syncStatus?.dataFlowStatus.downloadError ? "Error" : "Healthy"
              }}
            </NBadge>
          </div>

          <!-- Error Details -->
          <div class="flex flex-col gap-2 col-span-4">
            <span class="text-sm text-gray-500">Error Message</span>
            <NBadge
              v-if="syncStatus?.dataFlowStatus.downloadError"
              n="red sm"
              icon="carbon:warning-filled"
            >
              {{ syncStatus?.dataFlowStatus.downloadError.message }}
            </NBadge>
            <NBadge v-else n="slate sm" icon="carbon:checkmark-filled">
              N/A
            </NBadge>
          </div>
        </div>

        <div class="grid grid-cols-6 gap-4 mb-4">
          <!-- Upload Progress -->
          <div class="flex flex-col gap-2">
            <span class="text-sm text-gray-500">Upload Progress</span>
            <div class="flex items-center gap-2">
              <span v-if="syncStatus?.dataFlowStatus.uploading"
                >upload in progress...</span
              >
              <span v-else class="text-sm text-gray-400">No active upload</span>
            </div>
          </div>

          <!-- Error Indicator -->
          <div class="flex flex-col gap-2">
            <span class="text-sm text-gray-500">Status</span>
            <NBadge
              :n="syncStatus?.dataFlowStatus.uploadError ? 'red' : 'green'"
              :icon="
                syncStatus?.dataFlowStatus.uploadError
                  ? 'carbon:warning-filled'
                  : 'carbon:checkmark-filled'
              "
            >
              {{ syncStatus?.dataFlowStatus.uploadError ? "Error" : "Healthy" }}
            </NBadge>
          </div>

          <!-- Error Details -->
          <div class="flex flex-col gap-2 col-span-4">
            <span class="text-sm text-gray-500">Error Message</span>
            <NBadge
              v-if="syncStatus?.dataFlowStatus.uploadError"
              n="red sm"
              icon="carbon:warning-filled"
            >
              {{ syncStatus?.dataFlowStatus.uploadError.message }}
            </NBadge>
            <NBadge v-else n="slate sm" icon="carbon:checkmark-filled">
              N/A
            </NBadge>
          </div>
        </div>
      </NSectionBlock>

      <NSectionBlock icon="carbon:data-volume" text="Data Size">
        <div class="grid grid-cols-5 gap-4 mb-4">
          <div class="flex flex-col gap-2">
            <span class="text-sm text-gray-500">Buckets Synced</span>
            <span class="text-sm"> {{ totals.buckets }} </span>
          </div>

          <div class="flex flex-col gap-2">
            <span class="text-sm text-gray-500">Rows Synced</span>
            <span class="text-sm"> {{ totals.row_count }} </span>
          </div>

          <div class="flex flex-col gap-2">
            <span class="text-sm text-gray-500">Data size</span>
            <span class="text-sm">
              {{ totals.data_size }}
            </span>
          </div>

          <div class="flex flex-col gap-2">
            <span class="text-sm text-gray-500">Metadata size</span>
            <span class="text-sm">
              {{ totals.metadata_size }}
            </span>
          </div>

          <div class="flex flex-col gap-2">
            <span class="text-sm text-gray-500">Database Size</span>
            <span class="text-sm">
              {{ totals.download_size }}
            </span>
          </div>
        </div>
      </NSectionBlock>

      <NSectionBlock icon="carbon:data-share" text="Operations">
        <div class="grid grid-cols-2 gap-4 mb-4">
          <div class="flex flex-col gap-2">
            <span class="text-sm text-gray-500">Total operations</span>
            <span class="text-sm">
              {{ totals.total_operations }}
            </span>
          </div>

          <div class="flex flex-col gap-2">
            <span class="text-sm text-gray-500">Downloaded operations</span>
            <span class="text-sm">
              {{ totals.downloaded_operations }}
            </span>
          </div>
        </div>
      </NSectionBlock>
    </div>
    <div v-else>
      <NTip n="yellow">
        Failed to connect to the client. Did you open this page inside Nuxt
        DevTools?
      </NTip>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDevtoolsClient } from "@nuxt/devtools-kit/iframe-client";

const { syncStatus, totals, totalDownloadProgress } =
  usePowerSyncAppDiagnostics();

const client = useDevtoolsClient();
</script>
