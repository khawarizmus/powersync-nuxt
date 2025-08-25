import { useDevtoolsClient } from "@nuxt/devtools-kit/iframe-client";
import type {
  PowerSyncBackendConnector,
  PowerSyncDatabase,
  SyncStatus,
} from "@powersync/web";
import { WebStreamingSyncImplementation, WebRemote } from "@powersync/web";
import { DynamicSchemaManager } from "../../src/runtime/utils/DynamicSchemaManager";
import { RecordingStorageAdapter } from "../../src/runtime/utils/RecordingStorageAdapter";
import type { PowerSyncModuleOptions } from "../../src/module";

type AbstractPowerSyncBackendConnector =
  PowerSyncBackendConnector extends infer T ? T : never;

type JSONValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | JSONObject
  | JSONArray;
interface JSONObject {
  [key: string]: JSONValue;
}
type JSONArray = JSONValue[];

// Add interface for the reactive state
interface PowerSyncReactiveState {
  syncStatus: SyncStatus;
  connected: boolean;
  dataChanged: number;
}

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

export function usePowerSyncAppDiagnostics() {
  const devtoolsClient = useDevtoolsClient();

  const moduleOptions = computed<PowerSyncModuleOptions | undefined>(() => {
    const moduleOptions =
      devtoolsClient.value?.host?.nuxt.vueApp.config.globalProperties
        ?.$powerSyncModuleOptions;

    return moduleOptions as PowerSyncModuleOptions | undefined;
  });

  // Fix the type access - you're storing refs, so access the .value
  const db = computed<PowerSyncDatabase | null>(() => {
    const dbRef = devtoolsClient.value?.host?.nuxt.vueApp.config
      .globalProperties?.$inspectorPowerSyncDatabase as
      | Ref<PowerSyncDatabase>
      | undefined;
    return dbRef?.value ?? null;
  });

  const connector = computed<AbstractPowerSyncBackendConnector | null>(() => {
    const connectorRef = devtoolsClient.value?.host?.nuxt.vueApp.config
      .globalProperties?.$inspectorPowerSyncConnector as
      | Ref<AbstractPowerSyncBackendConnector>
      | undefined;
    return connectorRef?.value ?? null;
  });
  // const syncStatus = computed(() => db.value?.currentStatus);
  // const isConnected = computed(() => db.value?.connected);

  const reactiveState = computed<Ref<PowerSyncReactiveState> | null>(() => {
    return (
      devtoolsClient.value?.host?.nuxt.vueApp.config.globalProperties
        ?.$inspectorReactiveState ?? null
    );
  });

  const syncStatus = computed(() => reactiveState.value?.value?.syncStatus);
  const isConnected = computed(
    () => reactiveState.value?.value?.connected ?? false
  );

  // Watch for data changes and refresh accordingly
  watch(
    () => reactiveState.value?.value.dataChanged,
    async () => {
      if (db.value) {
        await refreshState();
      }
    }
  );

  // Set up diagnostics automatically
  const diagnosticsSync = ref<WebStreamingSyncImplementation | null>(null);
  const adapter = ref<RecordingStorageAdapter | null>(null);
  const schemaManager = new DynamicSchemaManager();

  db.value?.registerListener({
    statusChanged(status) {
      console.log("devtools Status changed:", status);
    },
  });
  watch(
    [db, connector, moduleOptions],
    ([dbValue, connectorValue, moduleOptionsValue]) => {
      if (dbValue && connectorValue && !adapter.value) {
        console.log("Setting up PowerSync diagnostics...");

        adapter.value = new RecordingStorageAdapter(
          ref(dbValue),
          ref(schemaManager)
        );

        // Create diagnostics sync implementation
        diagnosticsSync.value = new WebStreamingSyncImplementation({
          adapter: adapter.value,
          remote: new WebRemote(connectorValue),
          uploadCrud: async () => {
            // No-op for diagnostics
          },
          identifier: "main-app-diagnostics",
        });

        // Connect the diagnostics sync when the main app connects
        watch(
          () => dbValue.connected,
          (connected) => {
            if (
              connected &&
              diagnosticsSync.value &&
              !diagnosticsSync.value.syncStatus.connected
            ) {
              // Get the current connection params from the main app
              // diagnosticsSync.value
              //   .connect({
              //     params:
              //       moduleOptionsValue?.defaultConnectionParams ?? undefined,
              //   })
              //   .catch(console.error);
            }
          },
          { immediate: true }
        );
      }
    },
    { immediate: true }
  );

  const hasSynced = ref(false);
  const isSyncing = ref(false);
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

      if (synced_at != null && !syncStatus.value?.dataFlowStatus.downloading) {
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

      console.log("bucketRows", bucketRows.value?.[0]);
      console.log(
        "download_size",
        bucketRows.value?.reduce((total, row) => total + row.download_size, 0)
      );
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

  watch(
    () => syncStatus.value,
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
          value?.priorityStatusEntries.every((entry) => entry.hasSynced) ??
          false;
      }

      if (
        value?.dataFlowStatus.downloading ||
        value?.dataFlowStatus.uploading
      ) {
        isSyncing.value = true;
      } else {
        isSyncing.value = false;
      }
    }
  );

  const totals = computed(() => ({
    buckets: bucketRows.value?.length ?? 0,
    row_count:
      bucketRows.value?.reduce((total, row) => total + row.row_count, 0) ?? 0,
    downloaded_operations: bucketRows.value?.reduce(
      (total, row) => total + row.downloaded_operations,
      0
    ),
    total_operations:
      bucketRows.value?.reduce(
        (total, row) => total + row.total_operations,
        0
      ) ?? 0,
    data_size: formatBytes(
      bucketRows.value?.reduce((total, row) => total + row.data_size, 0) ?? 0
    ),
    metadata_size: formatBytes(
      bucketRows.value?.reduce((total, row) => total + row.metadata_size, 0) ??
        0
    ),
    download_size: formatBytes(
      bucketRows.value?.reduce((total, row) => total + row.download_size, 0) ??
        0
    ),
  }));

  const totalDownloadProgress = computed(() => {
    if (!hasSynced.value || isSyncing.value) {
      return (
        (syncStatus.value?.downloadProgress?.downloadedFraction ?? 0) * 100
      ).toFixed(1);
    }
    return 100;
  });

  async function clearData() {
    await diagnosticsSync.value?.disconnect();
    await db.value?.disconnectAndClear();
    await schemaManager.clear();
    await schemaManager.refreshSchema(db.value!.database);
    // await diagnosticsSync.value?.connect({
    //   params: moduleOptions.value?.defaultConnectionParams ?? undefined,
    // });
  }

  return {
    db: readonly(db),
    diagnosticsSync: readonly(diagnosticsSync),
    connector: readonly(connector),
    syncStatus: readonly(syncStatus),
    isConnected: readonly(isConnected),
    hasSynced: readonly(hasSynced),
    isSyncing: readonly(isSyncing),
    bucketRows: readonly(bucketRows),
    tableRows: readonly(tableRows),
    lastSyncedAt: readonly(lastSyncedAt),
    totals: readonly(totals),
    totalDownloadProgress: readonly(totalDownloadProgress),
    clearData,
  };
}
