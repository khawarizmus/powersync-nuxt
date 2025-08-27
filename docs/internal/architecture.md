# Architecture

This is a high level overview of the architecture of the Powersync Nuxt module. And the implementation details of the inspector page.

## What is it?

The Powersync Nuxt module provides a quick way to inspect and diagnose your PowerSync client and locale database. The module is built on top of the PowerSync SDK and Nuxt Devtools Kit.

## How it works?

To achieve the above the Module does few things:

- Injects a page in your app at `/__powersync-inspector` that you can use to inspect the state of the Powersync instance. 

- Exposes that inspector page through an Iframe in the Nuxt Devtool as a new tab. 

- Installs few other Nuxt modules needed by the page component. namely the the Devtools UI Kit and some VueUse

- Exposes some composables to help integrating your client and database to the inspector.

- Injects a plugin that helps share the connection params provided in it's config.


## Implementation details

### `PowerSyncDatabaseWithDiagnostics`

At it's core this module relies on the `PowerSyncDatabaseWithDiagnostics` class which extends `PowerSyncDatabase` to provide the inspector with a why to highjack the existing client and collect the data needed to display the inspector page.

When initialized as such:

```ts
const db = new PowerSyncDatabaseWithDiagnostics({
  database: {
    dbFilename: "your-db-filename.sqlite",
  },
  schema: yourSchema,
});
```

it overrides the following methods:

- The passed options will be overridden to enable log broadcasting and multi-tab support.
```ts
oconstructor(options: WebPowerSyncDatabaseOptions) {
    const { getCurrentSchemaManager } = usePowerSyncInspector();
    // Create schema manager before calling super
    const currentSchemaManager = getCurrentSchemaManager();

    options.flags = { // [!code focus]
      ...options.flags, // [!code focus]
      enableMultiTabs: true, // [!code focus]
      broadcastLogs: true, // enable log broadcasting for better diagnostics // [!code focus]
    }; // [!code focus]
    options.vfs = WASQLiteVFS.OPFSCoopSyncVFS; // better for multi-tab support // [!code focus]
    super(options); // [!code focus]

    // Set instance property and clear global
    this.schemaManager = currentSchemaManager;
  }
```

- `generateBucketStorageAdapter` is overridden to use the `RecordingStorageAdapter` class alongside the `DynamicSchemaManager` class to record the data needed to display the inspector page.

```ts
protected override generateBucketStorageAdapter() {
    const { getCurrentSchemaManager } = usePowerSyncInspector();
    // Create schema manager before calling super
    const currentSchemaManager = getCurrentSchemaManager();
    // Use global schema manager if available (during super() call), otherwise instance property
    const schemaManager = currentSchemaManager || this.schemaManager;

    const adapter = new RecordingStorageAdapter( // [!code focus]
      ref(this) as Ref<PowerSyncDatabase>, // [!code focus]
      ref(schemaManager) as Ref<DynamicSchemaManager> // [!code focus]
    ); // [!code focus]

    return adapter; // [!code focus]
  }
```

- `generateSyncStreamImplementation` is overridden to use a custom `WebStreamingSyncImplementation` instance that uses the `RecordingStorageAdapter` to record the data needed to display the inspector page.

```ts
protected override generateSyncStreamImplementation(
    connector: PowerSyncBackendConnector,
    options: RequiredAdditionalConnectionOptions
  ): StreamingSyncImplementation {

    return new WebStreamingSyncImplementation({ // [!code focus]
      adapter: this.bucketStorageAdapter, // This should be our RecordingStorageAdapter // [!code focus]
      remote: new WebRemote(connector), // [!code focus]
      uploadCrud: async () => { // [!code focus]
        await this.waitForReady(); // [!code focus]
        await connector.uploadData(this); // [!code focus]
      }, // [!code focus]
      identifier: // [!code focus]
        "dbFilename" in this.options.database // [!code focus]
          ? this.options.database.dbFilename // [!code focus]
          : "diagnostics-sync", // [!code focus]
      ...options, // [!code focus]
    }); // [!code focus]

  }
```

### RecordingStorageAdapter

The `RecordingStorageAdapter` is a custom storage adapter that extends the `SqliteBucketStorage` class to record the data needed to display the inspector page.

Think of it as a spy that records diagnostics every time sync operations are performed. It also records the schema changes (schema discovery) and the data that is being synced.

The `setTargetCheckpoint` method is overridden to keep an initial diagnostics record for the data that is going to be synced.

```ts
override async setTargetCheckpoint(checkpoint: Checkpoint) {
    await super.setTargetCheckpoint(checkpoint);
    await this.rdb.writeTransaction(async (tx) => {
      for (const bucket of checkpoint.buckets) {
        await tx.execute(
          `INSERT OR REPLACE INTO local_bucket_data(id, total_operations, last_op, download_size, downloading, downloaded_operations)
             VALUES (
              ?,
              ?,
              IFNULL((SELECT last_op FROM local_bucket_data WHERE id = ?), '0'),
              IFNULL((SELECT download_size FROM local_bucket_data WHERE id = ?), 0),
              IFNULL((SELECT downloading FROM local_bucket_data WHERE id = ?), TRUE),
              IFNULL((SELECT downloaded_operations FROM local_bucket_data WHERE id = ?), TRUE)
              )`,
          [
            bucket.bucket,
            bucket.count,
            bucket.bucket,
            bucket.bucket,
            bucket.bucket,
            bucket.bucket,
          ]
        );
      }
    });
  }
```

This data is stored in a locale table called `local_bucket_data`. Check the [AppSchema](#appschema) section for the schema definition.

The `saveSyncData` method is overridden to keep track of the progress of the sync operation. updating the same table with the progress of the sync operation.

```ts
override async saveSyncData(batch: SyncDataBatch) {
    await super.saveSyncData(batch);

    await this.rdb.writeTransaction(async (tx) => {
      for (const bucket of batch.buckets) {
        // Record metrics
        const size = JSON.stringify(bucket.data).length;
        await tx.execute(
          `UPDATE local_bucket_data SET
                download_size = IFNULL(download_size, 0) + ?,
                last_op = ?,
                downloading = ?,
                downloaded_operations = IFNULL(downloaded_operations, 0) + ?
              WHERE id = ?`,
          [
            size,
            bucket.next_after,
            bucket.has_more,
            bucket.data.length,
            bucket.bucket,
          ]
        );
      }
    });

    await this.schemaManager.updateFromOperations(batch);
  }
```

Finally the `syncLocalDatabase` method is overridden to mark the sync operation as complete when it's done. and refresh the schema to get the latest schema changes.

```ts
override async syncLocalDatabase(checkpoint: Checkpoint, priority?: number) {
    const r = await super.syncLocalDatabase(checkpoint, priority);

    setTimeout(() => {
      this.schemaManager.refreshSchema(this.rdb);
    }, 60);
    if (r.checkpointValid) {
      await this.rdb.execute(
        "UPDATE local_bucket_data SET downloading = FALSE"
      );
    }
    return r;
}
```

### DynamicSchemaManager

The `DynamicSchemaManager` class is a custom class that dynamically builds a representation of the schema from the data that is being synced. Think of it as a schema discovery tool that is able to build a schema from the data that is being synced.

It's used by the `RecordingStorageAdapter` to build and record the schema changes.

the core methods are:

- `updateFromOperations()` - Analyzes sync data and updates schema map
- `refreshSchema()` - Applies schema changes to the database using the `powersync_replace_schema` function.
- `buildSchema()` - Constructs complete schema from discovered fields
- `schemaToString()` - Returns a string representation of the schema. It uses `buildSchema()` under the hood.

### AppSchema

In order to have diagnostics data available to use, we need a way to store it. and for that we create two aditional locale tables to record the data.

```ts
export const local_bucket_data = new Table(
  {
    total_operations: column.integer,
    last_op: column.text,
    download_size: column.integer,
    downloaded_operations: column.integer,
    downloading: column.integer,
  },
  { localOnly: true }
);

export const local_schema = new Table(
  {
    data: column.text,
  },
  { localOnly: true }
);
```

The `local_bucket_data` table is used to record the start and end of the sync operation. and the progress of the sync operation. as well as wether the operation is in progress or not.

The `local_schema` table is used to record the most up to date schema version of the client.

### usePowerSyncInspector

The `usePowerSyncInspector` composable is used to expose few helpers and classes 

- It exposes the current schema manager instance via the `getCurrentSchemaManager` function. this is used by the `PowerSyncDatabaseWithDiagnostics` class to get the current schema manager instance and pass it to the `RecordingStorageAdapter` class.

- It also exposes the `RecordingStorageAdapter` class used by the `PowerSyncDatabaseWithDiagnostics` class.

- It also exposes the `diagnosticsSchema` object. This is intended for developers to use in their own schema to extend the schema with the diagnostics tables required for the inspector.

- It also exposes the `shareConnectorWithInspector` function which stores the connector in a global variable in the Nuxt app that can be used to share the connector with the inspector.

For better understanding of it's practical usage for developers, check the [Getting Started](../guide/getting-started.md) guide.

### usePowerSyncInspectorDiagnostics

The `usePowerSyncInspectorDiagnostics` composable is used to expose the diagnostics data. it is used by the inspector page to display the diagnostics data. and can be used by developers to access the diagnostics data in their own components.

This allows for greater flexibility as developers can build their own components to display the diagnostics data directly in their app.

#### Querying the diagnostics data

The `usePowerSyncInspectorDiagnostics` composable uses few custom queries to get buckets diagnostics data. and tables data. below are the queries used to get the data:

::: code-group

```sql [BUCKETS_QUERY]
WITH
  oplog_by_table AS
    (SELECT -- For each bucket + table combination, calculate sizes
      bucket,                                         -- e.g., "global", "user_data"  
      row_type,                                       -- e.g., "users", "products"
      sum(length(ifnull(data, ''))) as data_size,     -- Total bytes of actual data
      sum(length(row_type) + length(row_id) + length(key) + 44) as metadata_size, -- Overhead bytes
      count() as row_count                            -- Number of records
    FROM ps_oplog
    GROUP BY bucket, row_type),

  oplog_stats AS
    (SELECT -- Roll up stats per bucket across all tables
      bucket as bucket_id,
      sum(data_size) as data_size,        -- Total data across all tables in bucket
      sum(metadata_size) as metadata_size, -- Total metadata across all tables 
      sum(row_count) as row_count,        -- Total records across all tables
      json_group_array(row_type) tables   -- Array of table names: ["users", "products"]
    FROM oplog_by_table
    GROUP BY bucket)

-- Combine sync progress (local_bucket_data) with storage stats (oplog_stats)
SELECT
  local.id as name,                    -- Bucket name
  stats.tables,                        -- Which tables are in this bucket
  stats.data_size,                     -- How much data is stored
  stats.metadata_size,                 -- How much overhead
  local.download_size,                 -- How much was downloaded (from RecordingStorageAdapter)
  local.downloaded_operations,         -- Progress: operations completed
  local.total_operations,              -- Progress: operations total
  local.downloading                    -- Is it still downloading?
FROM local_bucket_data local
LEFT JOIN ps_buckets ON ps_buckets.name = local.id
LEFT JOIN oplog_stats stats ON stats.bucket_id = ps_buckets.id
```

```sql [TABLES_QUERY]
SELECT row_type as name, count() as count, sum(length(data)) as size FROM ps_oplog GROUP BY row_type
```

```sql [BUCKETS_QUERY_FAST]
SELECT
  local.id as name,
  '[]' as tables,           -- Empty array (no table details)
  0 as data_size,           -- No storage stats
  0 as metadata_size,       -- No storage stats  
  0 as row_count,           -- No storage stats
  local.download_size,      -- Just download progress
  local.downloaded_operations,
  local.total_operations,
  local.downloading
FROM local_bucket_data local`
```
:::

#### Reactive State Management

The composable manages several reactive state variables that track the current status of PowerSync:

```ts
// Connection & Sync Status
const hasSynced = ref(syncStatus.value?.hasSynced || false);
const isConnected = ref(syncStatus.value?.connected || false);
const isSyncing = ref(false);
const isDownloading = ref(
  syncStatus.value?.dataFlowStatus.downloading || false
);
const isUploading = ref(syncStatus.value?.dataFlowStatus.uploading || false);

// Progress & Timing
const lastSyncedAt = ref(syncStatus.value?.lastSyncedAt || "");
const downloadProgressDetails = ref(
  syncStatus.value?.dataFlowStatus.downloadProgress || null
);
const uploadQueueStats = ref<null | UploadQueueStats>(null);

// Error Handling
const uploadError = ref(syncStatus.value?.dataFlowStatus.uploadError || null);
const downloadError = ref(
  syncStatus.value?.dataFlowStatus.downloadError || null
);

// Data & Schema
const bucketRows = ref<null | any[]>(null);
const tableRows = ref<null | any[]>(null);
```

These refs are initialized from the current `syncStatus` but then get updated in real-time through listeners.

#### Computed Aggregations

The composable provides computed totals across all buckets:

```ts
const totals = computed(() => ({
  buckets: bucketRows.value?.length ?? 0,
  row_count: bucketRows.value?.reduce(...) ?? 0,
  downloaded_operations: bucketRows.value?.reduce(...),
  total_operations: bucketRows.value?.reduce(...) ?? 0,
  data_size: formatBytes(...),
  metadata_size: formatBytes(...),
  download_size: formatBytes(...),
}));
```

#### Querying the diagnostics data

```ts
async function refreshState() {
  if (db.value) {
    const { synced_at } = await db.value.get<{ synced_at: string | null }>(
      "SELECT powersync_last_synced_at() as synced_at"
    );

    uploadQueueStats.value = await db.value?.getUploadQueueStats(true);

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
  }
}
```

**Performance Strategy:**
- Always fetches upload queue stats for real-time upload monitoring
- Uses expensive queries only when sync is idle to avoid blocking active operations
- Falls back to fast queries during downloads for responsive progress updates

#### Real-time Updates

The composable automatically updates when PowerSync state changes:

**Status Listener:**
```ts
// Register listener for PowerSync status changes
const unregisterListener = db.value.registerListener({
  statusChanged: (newStatus) => {
    // Update reactive status
    hasSynced.value = !!newStatus.hasSynced;
    isConnected.value = !!newStatus.connected;
    isDownloading.value = !!newStatus.dataFlowStatus.downloading;
    isUploading.value = !!newStatus.dataFlowStatus.uploading;
    lastSyncedAt.value = newStatus.lastSyncedAt || "";
    uploadError.value = newStatus.dataFlowStatus.uploadError || null;
    downloadError.value = newStatus.dataFlowStatus.downloadError || null;
    downloadProgressDetails.value =
      newStatus.dataFlowStatus.downloadProgress || null;

    if (
      newStatus?.hasSynced === undefined ||
      (newStatus?.priorityStatusEntries?.length &&
        newStatus.priorityStatusEntries.length > 0)
    ) {
      hasSynced.value =
        newStatus?.priorityStatusEntries.every(
          (entry) => entry.hasSynced
        ) ?? false;
    }

    if (
      newStatus?.dataFlowStatus.downloading ||
      newStatus?.dataFlowStatus.uploading
    ) {
      isSyncing.value = true;
    } else {
      isSyncing.value = false;
    }
  },
});
```

**Database Change Listener:**
```ts
db.value.onChangeWithCallback(
  { async onChange(_event) { await refreshState(); } },
  {
    tables: [
      "ps_oplog",                           // PowerSync operation log
      "ps_buckets",                         // Bucket definitions  
      "ps_data_local__local_bucket_data",   // Our tracking table
      "ps_crud",                            // Upload queue
    ],
    throttleMs: 500  // Avoid excessive updates
  }
);
```

#### User Authentication

Extracts user information from JWT tokens:

```ts
const userID = computedAsync(async () => {
  const token = await connector.value?.fetchCredentials()?.token;
  if (!token) return null;
  
  const [_head, body, _signature] = token.split(".");
  const payload = JSON.parse(atob(body));  // Decode JWT payload
  return payload.sub;  // Return user ID from token
});
```

#### Utility Functions

**Data Management:**
```ts
const clearData = () => {
  db.value?.disconnectAndClear();           // Clear all sync data
  schemaManager.clear();                    // Reset schema discoveries
  schemaManager.refreshSchema(db.value.database); // Apply clean schema
  db.value.connect(connector.value!);       // Reconnect
};
```

**Formatting:**
```ts
// Converts bytes to human-readable format (KB, MB, GB, etc.)
const formatBytes = (bytes: number) => {
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
};
```

#### Exposed API

```ts
// exposed state
return {
  db,
  connector,
  syncStatus: readonly(syncStatus),
  hasSynced: readonly(hasSynced),
  isConnected: readonly(isConnected),
  isSyncing: readonly(isSyncing),
  isDownloading: readonly(isDownloading),
  isUploading: readonly(isUploading),
  downloadError: readonly(downloadError),
  uploadError: readonly(uploadError),
  downloadProgressDetails: readonly(downloadProgressDetails),
  lastSyncedAt: readonly(lastSyncedAt),
  totalDownloadProgress: readonly(totalDownloadProgress),
  uploadQueueStats: readonly(uploadQueueStats),
  uploadQueueCount: readonly(uploadQueueCount),
  uploadQueueSize: readonly(uploadQueueSize),
  userID: readonly(userID),
  bucketRows: readonly(bucketRows),
  tableRows: readonly(tableRows),
  totals: readonly(totals),
  clearData,
  formatBytes,
};
```

All state is exposed as `readonly` to prevent external mutations, while functions like `clearData` and `formatBytes` are provided for controlled interactions.

### Inspector Page

The inspector page is a [Nuxt page](https://nuxt.com/docs/4.x/guide/directory-structure/app/pages) that is used to display the diagnostics data. it is built using the [Devtools UI Kit](https://devtools.nuxt.com/module/ui-kit) and the [VueUse](https://vueuse.org/) library.

It uses the `usePowerSyncInspectorDiagnostics` composable to get the diagnostics data and display it in the page.

### Module

The module is a [Nuxt module](https://nuxt.com/docs/4.x/guide/directory-structure/modules) and it does the followings under the hood:

- Exposes it's own options to [Nuxt runtime config](https://nuxt.com/docs/4.x/guide/going-further/runtime-config)
- Installs the [Devtools UI Kit](https://devtools.nuxt.com/module/ui-kit) and the [VueUse](https://vueuse.org/) nuxt modules automatically.
- Injects a plugin that uses the [Nuxt runtime config](https://nuxt.com/docs/4.x/api/composables/use-runtime-config) to expose the module options via a global variable in the Nuxt app.
- Adds few auto-imports for the developers to use in their Nuxt app, namely:
  - `usePowerSyncInspector`
  - `usePowerSyncInspectorDiagnostics`
  - `PowerSyncDatabaseWithDiagnostics`
- Injects a new page to the Nuxt app at `/__powersync-inspector` route that is used to display the diagnostics data.
- Exposes that same page to Nuxt Devtools as a new tab using an Iframe.







