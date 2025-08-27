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

The `usePowerSyncInspectorDiagnostics` composable is used to expose the diagnostics data. it is used by the inspector page to display the data. and can be used by developers to access the data in their own components.

This allows for greater flexibility as developers can build their own components to display the data directly in their app.

### Inspector Page

The inspector page is a [Nuxt page](https://nuxt.com/docs/4.x/guide/directory-structure/app/pages) that is used to display the diagnostics data. it is built using the [Devtools UI Kit](https://devtools.nuxt.com/module/ui-kit) and the [VueUse](https://vueuse.org/) library.

It uses the `usePowerSyncInspectorDiagnostics` composable to get the diagnostics data and display it in the page.

### Module

The module is a [Nuxt module](https://nuxt.com/docs/4.x/guide/directory-structure/app/modules) and it does the followings under the hood:

- Exposes it's own options to [Nuxt runtime config](https://nuxt.com/docs/4.x/guide/going-further/runtime-config)
- Installs the [Devtools UI Kit](https://devtools.nuxt.com/module/ui-kit) and the [VueUse](https://vueuse.org/) nuxt modules automatically.
- Injects a plugin that uses the [Nuxt runtime config](https://nuxt.com/docs/4.x/api/composables/use-runtime-config) to expose the module options via a global variable in the Nuxt app.
- Adds few auto-imports for the developers to use in their Nuxt app, namely:
  - `usePowerSyncInspector`
  - `usePowerSyncInspectorDiagnostics`
  - `PowerSyncDatabaseWithDiagnostics`
- Injects a new page to the Nuxt app at `/__powersync-inspector` route that is used to display the diagnostics data.
- Exposes that same page to Nuxt Devtools as a new tab using an Iframe.







