import { DiagnosticsAppSchema } from "../../../inspector/utils/powersync/AppSchema";
import { RecordingStorageAdapter } from "../../../inspector/utils/powersync/RecordingStorageAdapter";

export function usePowerSyncDevtools() {
  const diagnosticsSchema = DiagnosticsAppSchema;

  return {
    diagnosticsSchema,
    RecordingStorageAdapter,
  };
}
