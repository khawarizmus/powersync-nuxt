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
                v-if="sync?.syncStatus.dataFlowStatus.downloadProgress !== null"
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
              :n="
                sync?.syncStatus.dataFlowStatus.downloadError ? 'red' : 'green'
              "
              :icon="
                sync?.syncStatus.dataFlowStatus.downloadError
                  ? 'carbon:warning-filled'
                  : 'carbon:checkmark-filled'
              "
            >
              {{
                sync?.syncStatus.dataFlowStatus.downloadError
                  ? "Error"
                  : "Healthy"
              }}
            </NBadge>
          </div>

          <!-- Error Details -->
          <div class="flex flex-col gap-2 col-span-4">
            <span class="text-sm text-gray-500">Error Message</span>
            <NBadge
              v-if="sync?.syncStatus.dataFlowStatus.downloadError"
              n="red sm"
              icon="carbon:warning-filled"
            >
              {{ sync?.syncStatus.dataFlowStatus.downloadError.message }}
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
              <span v-if="sync?.syncStatus.dataFlowStatus.uploading"
                >upload in progress...</span
              >
              <span v-else class="text-sm text-gray-400">No active upload</span>
            </div>
          </div>

          <!-- Error Indicator -->
          <div class="flex flex-col gap-2">
            <span class="text-sm text-gray-500">Status</span>
            <NBadge
              :n="sync?.syncStatus.dataFlowStatus.uploadError ? 'red' : 'green'"
              :icon="
                sync?.syncStatus.dataFlowStatus.uploadError
                  ? 'carbon:warning-filled'
                  : 'carbon:checkmark-filled'
              "
            >
              {{
                sync?.syncStatus.dataFlowStatus.uploadError
                  ? "Error"
                  : "Healthy"
              }}
            </NBadge>
          </div>

          <!-- Error Details -->
          <div class="flex flex-col gap-2 col-span-4">
            <span class="text-sm text-gray-500">Error Message</span>
            <NBadge
              v-if="sync?.syncStatus.dataFlowStatus.uploadError"
              n="red sm"
              icon="carbon:warning-filled"
            >
              {{ sync?.syncStatus.dataFlowStatus.uploadError.message }}
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
              {{ formatBytes(totals.data_size) }}
            </span>
          </div>

          <div class="flex flex-col gap-2">
            <span class="text-sm text-gray-500">Metadata size</span>
            <span class="text-sm">
              {{ formatBytes(totals.metadata_size) }}
            </span>
          </div>

          <div class="flex flex-col gap-2">
            <span class="text-sm text-gray-500">Database Size</span>
            <span class="text-sm">
              {{ formatBytes(totals.download_size) }}
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

const { db, sync } = useConnectionManager();

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

const rows = computed(() =>
  (bucketRows.value ?? []).map((r) => {
    return {
      id: r.name,
      name: r.name,
      tables: JSON.parse(r.tables ?? "[]").join(", "),
      row_count: r.row_count,
      downloaded_operations: r.downloaded_operations,
      total_operations: r.total_operations,
      data_size: r.data_size,
      metadata_size: r.metadata_size,
      download_size: r.download_size,
      status: r.downloading == 0 ? "Ready" : "Downloading...",
    };
  })
);

const totals = computed(() => ({
  buckets: rows.value.length,
  row_count: rows.value.reduce((total, row) => total + row.row_count, 0),
  downloaded_operations: rows.value.reduce(
    (total, row) => total + row.downloaded_operations,
    0
  ),
  total_operations: rows.value.reduce(
    (total, row) => total + row.total_operations,
    0
  ),
  data_size: rows.value.reduce((total, row) => total + row.data_size, 0),
  metadata_size: rows.value.reduce(
    (total, row) => total + row.metadata_size,
    0
  ),
  download_size: rows.value.reduce(
    (total, row) => total + row.download_size,
    0
  ),
}));

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = [
    "Bytes",
    "KiB",
    "MiB",
    "GiB",
    "TiB",
    "PiB",
    "EiB",
    "ZiB",
    "YiB",
  ];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${Number.parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${
    sizes[i]
  }`;
}

const hasSynced = ref(false);
const syncing = ref(false);

watch(
  () => sync.value?.syncStatus,
  (value) => {
    if (value?.hasSynced) {
      hasSynced.value = true;
    }

    if (
      value?.hasSynced === undefined ||
      (value?.priorityStatusEntries?.length &&
        value.priorityStatusEntries.length > 0)
    ) {
      hasSynced.value =
        value?.priorityStatusEntries.every((entry) => entry.hasSynced) ?? false;
    }

    if (value?.dataFlowStatus.downloading || value?.dataFlowStatus.uploading) {
      syncing.value = true;
    } else {
      syncing.value = false;
    }
  }
);

const totalDownloadProgress = computed(() => {
  if (!hasSynced.value || syncing.value) {
    return (
      (sync.value?.syncStatus.downloadProgress?.downloadedFraction ?? 0) * 100
    ).toFixed(1);
  }
  return 100;
});
</script>
