import type { PowerSyncBackendConnector } from "@powersync/web";
import { DiagnosticsAppSchema } from "../utils/AppSchema";
import { RecordingStorageAdapter } from "../utils/RecordingStorageAdapter";
import { DynamicSchemaManager } from "../utils/DynamicSchemaManager";
import { ref } from "vue";

function shareConnectorWithInspector(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  nuxtApp: any,
  connector: PowerSyncBackendConnector
) {
  nuxtApp.vueApp.config.globalProperties.$inspectorPowerSyncConnector =
    ref(connector);
}

// Global variable to store schema manager during construction
let currentSchemaManager: DynamicSchemaManager | null = null;

function getCurrentSchemaManager() {
  if (currentSchemaManager) {
    return currentSchemaManager;
  }
  currentSchemaManager = new DynamicSchemaManager();
  return currentSchemaManager;
}

export function usePowerSyncInspector() {
  const diagnosticsSchema = DiagnosticsAppSchema;

  return {
    diagnosticsSchema,
    RecordingStorageAdapter,
    shareConnectorWithInspector,
    getCurrentSchemaManager,
  };
}
