<script setup lang="ts">
import { useDevtoolsClient } from "@nuxt/devtools-kit/iframe-client";

const { status, db, sync } = useConnectionManager();

const client = useDevtoolsClient();
// implement download and upload errors

const BUCKETS_QUERY = `
WITH
  oplog_by_table AS
    (SELECT
      bucket,
      row_type,
      sum(length(ifnull(data, ''))) as data_size,
      sum(length(row_type) + length(row_id) + length(key) + 44) as metadata_size,
      count() as row_count
    FROM ps_oplog
    GROUP BY bucket, row_type),

  oplog_stats AS
    (SELECT
      bucket as bucket_id,
      sum(data_size) as data_size,
      sum(metadata_size) as metadata_size,
      sum(row_count) as row_count,
      json_group_array(row_type) tables
    FROM oplog_by_table
    GROUP BY bucket)

SELECT
  local.id as name,
  stats.tables,
  stats.data_size,
  stats.metadata_size,
  IFNULL(stats.row_count, 0) as row_count,
  local.download_size,
  local.downloaded_operations,
  local.total_operations,
  local.downloading
FROM local_bucket_data local
LEFT JOIN ps_buckets ON ps_buckets.name = local.id
LEFT JOIN oplog_stats stats ON stats.bucket_id = ps_buckets.id`;

const TABLES_QUERY = `
SELECT row_type as name, count() as count, sum(length(data)) as size FROM ps_oplog GROUP BY row_type
`;

const BUCKETS_QUERY_FAST = `
SELECT
  local.id as name,
  '[]' as tables,
  0 as data_size,
  0 as metadata_size,
  0 as row_count,
  local.download_size,
  local.downloaded_operations,
  local.total_operations,
  local.downloading
FROM local_bucket_data local`;

/* eslint-disable @typescript-eslint/no-explicit-any */
const bucketRows = ref<null | any[]>(null);
const tableRows = ref<null | any[]>(null);
const lastSyncedAt = ref<Date | null>(null);

const bucketRowsLoading = computed(() => bucketRows.value == null);
const tableRowsLoading = computed(() => tableRows.value == null);

async function refreshState() {
  if (db.value) {
    const { synced_at } = await db.value.get<{ synced_at: string | null }>(
      "SELECT powersync_last_synced_at() as synced_at"
    );
    lastSyncedAt.value = synced_at ? new Date(synced_at + "Z") : null;

    if (
      synced_at != null &&
      !sync.value?.syncStatus.dataFlowStatus.downloading
    ) {
      // These are potentially expensive queries - do not run during initial sync
      bucketRows.value = await db.value.getAll(BUCKETS_QUERY);
      tableRows.value = await db.value.getAll(TABLES_QUERY);
    } else if (synced_at != null) {
      // Busy downloading, but have already synced once
      bucketRows.value = await db.value.getAll(BUCKETS_QUERY_FAST);
      // Load tables if we haven't yet
      if (tableRows.value == null) {
        tableRows.value = await db.value.getAll(TABLES_QUERY);
      }
    } else {
      // Fast query to show progress during initial sync / while downloading bulk data
      bucketRows.value = await db.value.getAll(BUCKETS_QUERY_FAST);
      tableRows.value = null;
    }
  }
}

onMounted(async () => {
  db.value!.onChangeWithCallback(
    {
      async onChange(_event) {
        await refreshState();
      },
    },
    {
      rawTableNames: true,
      tables: ["ps_oplog", "ps_buckets", "ps_data_local__local_bucket_data"],
      throttleMs: 500,
    }
  );

  await refreshState();
});

const unregister = db.value!.registerListener({
  statusChanged(newStatus) {
    console.log("new status triggered health", newStatus);
    // status.value = newStatus;
  },
});

onUnmounted(() => {
  unregister();
});
</script>

<template>
  <div class="relative n-bg-base flex flex-col h-screen">
    {{ lastSyncedAt }}
    {{ bucketRowsLoading }}
    {{ tableRowsLoading }}
    {{ bucketRows }}
    {{ tableRows }}

    <div v-if="client" class="flex flex-col gap-2">
      <NSectionBlock icon="carbon:data-share" text="Data Flow">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <!-- Download Progress -->
          <div class="flex flex-col gap-2">
            <span class="text-sm text-gray-500">Progress</span>
            <div class="flex items-center gap-2">
              <template
                v-if="status?.dataFlowStatus?.downloadProgress !== null"
              >
                <div class="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    :style="{
                      width: `${
                        status?.dataFlowStatus?.downloadProgress ?? 0
                      }%`,
                    }"
                  ></div>
                </div>
                <span class="text-sm font-medium"
                  >{{ status?.dataFlowStatus?.downloadProgress ?? 0 }}%</span
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
              :n="status?.dataFlowStatus?.downloadError ? 'red' : 'green'"
              :icon="
                status?.dataFlowStatus?.downloadError
                  ? 'carbon:warning-filled'
                  : 'carbon:checkmark-filled'
              "
            >
              {{ status?.dataFlowStatus?.downloadError ? "Error" : "Healthy" }}
            </NBadge>
          </div>
        </div>

        <!-- Error Details -->
        <div v-if="status?.dataFlowStatus?.downloadError" class="mt-4">
          <NTip n="red" icon="carbon:warning-filled">
            <div class="flex flex-col gap-2">
              <span class="font-semibold">Download Error:</span>
              <code
                class="text-xs bg-red-50 p-2 rounded border-l-4 border-red-300 whitespace-pre-wrap"
                >{{ dataFlow.downloadError }}</code
              >
            </div>
          </NTip>
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
