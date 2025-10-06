import {
  PowerSyncDatabase,
  SharedWebStreamingSyncImplementation,
  WASQLiteVFS,
  WebRemote,
  WebStreamingSyncImplementation,
  // WebStreamingSyncImplementation,
  type DBAdapter,
  type DisconnectAndClearOptions,
  type PowerSyncBackendConnector,
  type PowerSyncConnectionOptions,
  type RequiredAdditionalConnectionOptions,
  type ResolvedWebSQLOpenOptions,
  type StreamingSyncImplementation,
  type WebPowerSyncDatabaseOptions,
} from '@powersync/web'
import { RecordingStorageAdapter } from './RecordingStorageAdapter'
import type { DynamicSchemaManager } from './DynamicSchemaManager'
import { usePowerSyncInspector } from '../composables/usePowerSyncInspector'
import { useDiagnosticsLogger } from '../composables/useDiagnosticsLogger'
import { ref, type Ref } from 'vue'

export type SharedConnectionWorker = {
  identifier: string
  port: MessagePort
}

export interface WebDBAdapter extends DBAdapter {
  /**
   * Get a MessagePort which can be used to share the internals of this connection.
   */
  shareConnection(): Promise<SharedConnectionWorker>

  /**
   * Get the config options used to open this connection.
   * This is useful for sharing connections.
   */
  getConfiguration(): ResolvedWebSQLOpenOptions
}

export class PowerSyncDatabaseWithDiagnostics extends PowerSyncDatabase {
  private schemaManager!: DynamicSchemaManager
  private _connector: PowerSyncBackendConnector | null = null
  private _connectionOptions: PowerSyncConnectionOptions | null = null

  get dbOptions(): WebPowerSyncDatabaseOptions {
    return this.options
  }

  override get connector() {
    return this._connector ?? super.connector
  }

  override get connectionOptions() {
    return this._connectionOptions ?? super.connectionOptions
  }

  constructor(options: WebPowerSyncDatabaseOptions) {
    const { logger } = useDiagnosticsLogger()
    const { getCurrentSchemaManager } = usePowerSyncInspector()
    // Create schema manager before calling super
    const currentSchemaManager = getCurrentSchemaManager()

    // override settings to make the instance work better with multitab since the devtools will be open at the same time
    options.flags = {
      ...options.flags,
      enableMultiTabs: true,
      broadcastLogs: true, // need to be enabled for multitab support
    }
    // @ts-expect-error - type error because we are forcing the vfs to be the OPFSCoopSyncVFS
    options.vfs = WASQLiteVFS.OPFSCoopSyncVFS
    // override logger to use the logger from the utils/Logger.ts file
    options.logger = logger
    super(options)

    // Set instance property and clear global
    this.schemaManager = currentSchemaManager
  }

  protected override generateBucketStorageAdapter() {
    const { getCurrentSchemaManager } = usePowerSyncInspector()

    const currentSchemaManager = getCurrentSchemaManager()
    const schemaManager = currentSchemaManager || this.schemaManager

    const adapter = new RecordingStorageAdapter(
      ref(this) as Ref<PowerSyncDatabase>,
      ref(schemaManager) as Ref<DynamicSchemaManager>,
    )

    return adapter
  }

  protected override generateSyncStreamImplementation(
    connector: PowerSyncBackendConnector,
    options: RequiredAdditionalConnectionOptions,
  ): StreamingSyncImplementation {
    const { logger } = useDiagnosticsLogger()
    return new SharedWebStreamingSyncImplementation({
      adapter: this.bucketStorageAdapter, // This should be our RecordingStorageAdapter
      remote: new WebRemote(connector, logger),
      uploadCrud: async () => {
        await this.waitForReady()
        await connector.uploadData(this)
      },
      identifier:
        'dbFilename' in this.options.database
          ? this.options.database.dbFilename
          : 'diagnostics-sync',
      ...options,
      logger,
      db: this.database as WebDBAdapter, // This should always be the case
    })
    // return new WebStreamingSyncImplementation({
    //   adapter: this.bucketStorageAdapter, // This should be our RecordingStorageAdapter
    //   remote: new WebRemote(connector, logger),
    //   uploadCrud: async () => {
    //     await this.waitForReady()
    //     await connector.uploadData(this)
    //   },
    //   identifier:
    //     'dbFilename' in this.options.database
    //       ? this.options.database.dbFilename
    //       : 'diagnostics-sync',
    //   logger,
    //   ...options,
    // })
  }

  override async connect(connector: PowerSyncBackendConnector, options?: PowerSyncConnectionOptions) {
    this._connector = connector
    this._connectionOptions = options ?? null
    await super.connect(connector, options)
  }

  override async disconnect() {
    this._connector = null
    this._connectionOptions = null
    await super.disconnect()
  }

  override async disconnectAndClear(options?: DisconnectAndClearOptions) {
    this._connector = null
    this._connectionOptions = null
    await super.disconnectAndClear(options)
  }
}
