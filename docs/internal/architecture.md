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

### PowerSyncDatabaseWithDiagnostics

At it's core this module relies on the `PowerSyncDatabaseWithDiagnostics` class which extends `PowerSyncDatabase` to provide the inspector with a why to highjack the existing client and collect the data needed to display the inspector page.

When initialized as such:

```ts
const db = new PowerSyncDatabaseWithDiagnostics({ // [!code ++]
      database: {
        dbFilename: "your-db-filename.sqlite",
      },
      schema: yourSchema,
    });
```

it overrides the following methods:

- The passed options will be overridden to enable log broadcasting and multi-tab support.
```ts
options.flags = {
      ...options.flags,
      enableMultiTabs: true,
      broadcastLogs: true, // enable log broadcasting for better diagnostics
    };
options.vfs = WASQLiteVFS.OPFSCoopSyncVFS; // better for multi-tab support
```

- `generateBucketStorageAdapter` is to use the `RecordingStorageAdapter` class alongside the `DynamicSchemaManager` class to record the data needed to display the inspector page.

```ts
protected override generateBucketStorageAdapter() {
    const { getCurrentSchemaManager } = usePowerSyncInspector();
    // Create schema manager before calling super
    const currentSchemaManager = getCurrentSchemaManager();
    // Use global schema manager if available (during super() call), otherwise instance property
    const schemaManager = currentSchemaManager || this.schemaManager;

    const adapter = new RecordingStorageAdapter(
      ref(this) as Ref<PowerSyncDatabase>,
      ref(schemaManager) as Ref<DynamicSchemaManager>
    );

    return adapter;
  }
```

- `generateSyncStreamImplementation` is overriden to use a custom `WebStreamingSyncImplementation` instance that uses the `RecordingStorageAdapter` to record the data needed to display the inspector page.

```ts
protected override generateSyncStreamImplementation(
    connector: PowerSyncBackendConnector,
    options: RequiredAdditionalConnectionOptions
  ): StreamingSyncImplementation {
    return new WebStreamingSyncImplementation({
      adapter: this.bucketStorageAdapter, // This should be our RecordingStorageAdapter
      remote: new WebRemote(connector),
      uploadCrud: async () => {
        await this.waitForReady();
        await connector.uploadData(this);
      },
      identifier:
        "dbFilename" in this.options.database
          ? this.options.database.dbFilename
          : "diagnostics-sync",
      ...options,
    });
  }
```

### RecordingStorageAdapter

### DynamicSchemaManager

### AppSchema

### usePowerSyncInspector

### usePowerSyncInspectorDiagnostics

### Module




