import {
  PowerSyncDatabase,
  WASQLiteVFS,
  WebRemote,
  WebStreamingSyncImplementation,
  type PowerSyncBackendConnector,
  type RequiredAdditionalConnectionOptions,
  type StreamingSyncImplementation,
  type WebPowerSyncDatabaseOptions,
} from "@powersync/web";
import { RecordingStorageAdapter } from "./RecordingStorageAdapter";
import type { DynamicSchemaManager } from "./DynamicSchemaManager";
import { usePowerSyncInspector } from "../composables/usePowerSyncInspector";

export class PowerSyncDatabaseWithDiagnostics extends PowerSyncDatabase {
  private schemaManager!: DynamicSchemaManager;

  constructor(options: WebPowerSyncDatabaseOptions) {
    const { getCurrentSchemaManager } = usePowerSyncInspector();
    // Create schema manager before calling super
    const currentSchemaManager = getCurrentSchemaManager();

    // override settings to make the instance work better with multitab since the devtools will be open at the same time
    options.flags = {
      ...options.flags,
      enableMultiTabs: true,
      broadcastLogs: true, // enable log broadcasting for better diagnostics
    };
    // @ts-expect-error - type error because we are forcing the vfs to be the OPFSCoopSyncVFS
    options.vfs = WASQLiteVFS.OPFSCoopSyncVFS;
    super(options);

    // Set instance property and clear global
    this.schemaManager = currentSchemaManager;
  }

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
}
