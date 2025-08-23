import type {
  BaseListener,
  WebStreamingSyncImplementationOptions,
} from "@powersync/web";
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

import { DynamicSchemaManager } from "./DynamicSchemaManager";
import { RecordingStorageAdapter } from "./RecordingStorageAdapter";
import { TokenConnector } from "./TokenConnector";
import { destr } from "destr";

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

const baseLogger = createBaseLogger();
baseLogger.useDefaults();
baseLogger.setLevel(LogLevel.DEBUG);

export const PARAMS_STORE = "currentParams";

export const getParams = (): Record<string, JSONValue> | undefined => {
  const stringifiedParams = localStorage.getItem(PARAMS_STORE);
  console.log("stringifiedParams", stringifiedParams);
  const params = destr<Record<string, JSONValue>>(stringifiedParams || "{}");
  console.log("params", params);
  return params;
};

export const schemaManager = new DynamicSchemaManager();

const openFactory = new WASQLiteOpenFactory({
  dbFilename: "diagnostics.db",
  debugMode: true,
  cacheSizeKb: 500 * 1024,
  temporaryStorage: TemporaryStorageOption.MEMORY,
  vfs: WASQLiteVFS.OPFSCoopSyncVFS,
});

export const db = new PowerSyncDatabase({
  database: openFactory,
  schema: schemaManager.buildSchema(),
});

export const connector = new TokenConnector();

const adapter = new RecordingStorageAdapter(db.database, schemaManager);

// eslint-disable-next-line import/no-mutable-exports
export let sync: WebStreamingSyncImplementation | undefined;

export interface SyncErrorListener extends BaseListener {
  lastErrorUpdated?: ((error: Error) => void) | undefined;
}

if (connector.hasCredentials()) {
  connect();
}

export async function connect() {
  const params = getParams();
  await sync?.disconnect();
  const remote = new WebRemote(connector);
  const syncOptions: WebStreamingSyncImplementationOptions = {
    adapter,
    remote,
    uploadCrud: async () => {
      // No-op
    },
    identifier: "diagnostics",
  };
  sync = new WebStreamingSyncImplementation(syncOptions);
  try {
    console.log("trying to connect");
    await sync.connect({ params });
    console.log("connected");
  } catch (e) {
    console.error("error", e);
    throw e;
  }

  if (!sync.syncStatus.connected) {
    const error =
      sync.syncStatus.dataFlowStatus.downloadError ??
      new Error("Failed to connect");
    // Disconnect but don't wait for it
    await sync.disconnect();
    throw error;
  }
}

export async function clearData() {
  await sync?.disconnect();
  await db.disconnectAndClear();
  await schemaManager.clear();
  await schemaManager.refreshSchema(db.database);
  if (connector.hasCredentials()) {
    const params = getParams();
    await sync?.connect({ params });
  }
}

export async function disconnect() {
  await sync?.disconnect();
}

export async function signOut() {
  connector.clearCredentials();
  await disconnect();
  await db.disconnectAndClear();
  await schemaManager.clear();
}

export const setParams = (p: object) => {
  const stringified = JSON.stringify(p);
  localStorage.setItem(PARAMS_STORE, stringified);
  connect();
};

(window as any).db = db;
