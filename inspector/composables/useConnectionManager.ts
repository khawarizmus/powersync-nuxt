/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SyncStatus } from "@powersync/web";
import {
  createBaseLogger,
  LogLevel,
  TemporaryStorageOption,
  WASQLiteOpenFactory,
  WASQLiteVFS,
  WebStreamingSyncImplementation,
  PowerSyncDatabase,
  WebRemote,
} from "@powersync/web";

import { DynamicSchemaManager } from "../utils/powersync/DynamicSchemaManager";
import { RecordingStorageAdapter } from "../utils/powersync/RecordingStorageAdapter";
import { TokenConnector } from "../utils/powersync/TokenConnector";

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

// interface SyncErrorListener extends BaseListener {
//   lastErrorUpdated?: ((error: Error) => void) | undefined;
// }

const baseLogger = createBaseLogger();
const loggerSet = ref(false);

const PARAMS_STORE = "currentParams";
const getParams = (): Record<string, JSONValue> | undefined => {
  //   const stringifiedParams = localStorage.getItem(PARAMS_STORE);
  //   const params = destr<Record<string, JSONValue>>(stringifiedParams || "{}");
  //   return params;

  return {
    locale: "en",
  };
};

const schemaManager = ref<DynamicSchemaManager | null>(null);
const openFactory = ref<WASQLiteOpenFactory | null>(null);
const db = ref<PowerSyncDatabase | null>(null);
const connector = ref<TokenConnector | null>(null);
const adapter = ref<RecordingStorageAdapter | null>(null);
const sync = ref<WebStreamingSyncImplementation | null>(null);

const syncStatus = ref<SyncStatus | null>(null);

async function connect() {
  const params = getParams();
  await sync?.value?.disconnect();

  if (!sync.value) {
    try {
      sync.value = new WebStreamingSyncImplementation({
        adapter: toRaw(adapter.value!),
        remote: new WebRemote(toRaw(connector.value!)),
        uploadCrud: async () => {
          // No-op
        },
        identifier: "diagnostics",
      });
    } catch (e) {
      console.error("Cant initialize sync", e);
      throw e;
    }
  }
  try {
    console.log("trying to connect");
    await sync.value.connect({ params });
    console.log("connected");
  } catch (e) {
    console.error("error", e);
    throw e;
  }

  if (!sync.value?.syncStatus.connected) {
    const error =
      sync.value?.syncStatus.dataFlowStatus.downloadError ??
      new Error("Failed to connect");
    // Disconnect but don't wait for it
    await sync.value?.disconnect();
    throw error;
  }
}

async function clearData() {
  await sync?.value?.disconnect();
  await db.value?.disconnectAndClear();
  await schemaManager.value?.clear();
  await schemaManager.value?.refreshSchema(db.value?.database);
  if (connector.value?.hasCredentials()) {
    const params = getParams();
    await sync.value?.connect({ params });
  }
}

async function disconnect() {
  await sync?.value?.disconnect();
}

async function signOut() {
  connector.value?.clearCredentials();
  await disconnect();
  await db.value?.disconnectAndClear();
  await schemaManager.value?.clear();
}

const setParams = (p: object) => {
  const stringified = JSON.stringify(p);
  localStorage.setItem(PARAMS_STORE, stringified);
  connect();
};

export function useConnectionManager() {
  tryOnMounted(() => {
    if (!loggerSet.value) {
      baseLogger.useDefaults();
      baseLogger.setLevel(LogLevel.DEBUG);
      loggerSet.value = true;
    }

    if (!schemaManager.value) {
      schemaManager.value = new DynamicSchemaManager();
    }

    if (!openFactory.value) {
      openFactory.value = new WASQLiteOpenFactory({
        dbFilename: "diagnostics.db",
        debugMode: true,
        cacheSizeKb: 500 * 1024,
        temporaryStorage: TemporaryStorageOption.MEMORY,
        vfs: WASQLiteVFS.OPFSCoopSyncVFS,
      });
    }

    if (!db.value) {
      db.value = new PowerSyncDatabase({
        database: toRaw(openFactory.value),
        schema: schemaManager.value.buildSchema(),
      });
    }

    if (!connector.value) {
      connector.value = new TokenConnector();
      // inject the connect function
      connector.value.setConnectFunction(connect);
    }

    if (!adapter.value) {
      adapter.value = new RecordingStorageAdapter(
        db as Ref<PowerSyncDatabase>,
        schemaManager as Ref<DynamicSchemaManager>
      );
    }

    if (connector.value.hasCredentials()) {
      connect();
    }

    const unregisterListener = db.value.registerListener({
      statusChanged: (status) => {
        console.log("composables status changed", status);
        syncStatus.value = status;
      },
    });

    tryOnUnmounted(() => {
      unregisterListener();
    });
  });

  return {
    status: syncStatus,
    sync,
    db,
    adapter,
    connector,
    schemaManager,
    openFactory,
    connect,
    clearData,
    disconnect,
    signOut,
    setParams,
  };
}
