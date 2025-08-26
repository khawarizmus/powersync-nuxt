# Composables

This module provides several composables to help you work with PowerSync Inspector and diagnostics in your Nuxt application.

## `usePowerSyncInspector()`

The main composable for setting up PowerSync Inspector functionality. This composable provides utilities for schema management, connector sharing, and diagnostics setup.

### Returns

```typescript
{
  diagnosticsSchema: Schema,
  RecordingStorageAdapter: Class,
  shareConnectorWithInspector: Function,
  getCurrentSchemaManager: Function
}
```

### Properties

#### `diagnosticsSchema`
- **Type**: `Schema`
- **Description**: The schema for diagnostics data collection. Use this to extend your app schema with diagnostic tables.

#### `RecordingStorageAdapter`
- **Type**: `Class`
- **Description**: Used internally. Storage adapter class that records operations for diagnostic purposes.

### Methods

#### `shareConnectorWithInspector(nuxtApp, connector)`
- **Parameters**:
  - `nuxtApp`: The Nuxt app instance
  - `connector`: Your PowerSync backend connector
- **Description**: Shares your PowerSync connector with the inspector for authentication and connection management.

#### `getCurrentSchemaManager()`
- **Returns**: `DynamicSchemaManager`
- **Description**: Used internally. Gets the current schema manager instance for dynamic schema operations.

### Usage

```typescript
// In your PowerSync plugin
const { 
  diagnosticsSchema, 
  shareConnectorWithInspector 
} = usePowerSyncInspector();

// Extend your schema
const combinedSchema = new Schema([
  ...yourAppSchema.tables,
  ...diagnosticsSchema.tables,
]);

// Share connector with inspector
shareConnectorWithInspector(nuxtApp, connector);
```

---

## `usePowerSyncInspectorDiagnostics()`

A comprehensive composable that provides real-time diagnostics data and sync status monitoring for your PowerSync client and local database. This composable can be used to create your own inspector.

### Returns

```typescript
{
  // Database & Connection
  db: Ref<PowerSyncDatabase>,
  connector: ComputedRef<PowerSyncBackendConnector | null>,
  
  // Sync Status
  syncStatus: Readonly<Ref<SyncStatus>>,
  hasSynced: Readonly<Ref<boolean>>,
  isConnected: Readonly<Ref<boolean>>,
  isSyncing: Readonly<Ref<boolean>>,
  isDownloading: Readonly<Ref<boolean>>,
  isUploading: Readonly<Ref<boolean>>,
  lastSyncedAt: Readonly<Ref<string>>,
  
  // Progress & Statistics
  totalDownloadProgress: Readonly<ComputedRef<string>>,
  uploadQueueStats: Readonly<Ref<UploadQueueStats | null>>,
  bucketRows: Readonly<Ref<any[] | null>>,
  tableRows: Readonly<Ref<any[] | null>>,
  totals: Readonly<ComputedRef<TotalsObject>>,
  
  // Error Handling
  downloadError: Readonly<Ref<Error | null>>,
  uploadError: Readonly<Ref<Error | null>>,
  downloadProgressDetails: Readonly<Ref<DownloadProgress | null>>,
  
  // User Info
  userID: Readonly<ComputedRef<string | null>>,
  
  // Utilities
  clearData: Function,
  formatBytes: Function
}
```

### Reactive Properties

#### Connection Status
- **`isConnected`**: Whether the PowerSync client is connected to the server
- **`hasSynced`**: Whether the initial sync has completed
- **`isSyncing`**: Whether any sync operation is currently active
- **`isDownloading`**: Whether data is being downloaded from the server
- **`isUploading`**: Whether local changes are being uploaded
- **`lastSyncedAt`**: Timestamp of the last successful sync

#### Progress Tracking
- **`totalDownloadProgress`**: Download progress as a percentage string (e.g., "85.5")
- **`uploadQueueStats`**: Statistics about pending upload operations
- **`downloadProgressDetails`**: Detailed information about current download progress

#### Data Inspection
- **`bucketRows`**: Information about sync buckets and their data
- **`tableRows`**: Statistics about database tables and row counts
- **`totals`**: Computed totals including bucket count, row count, data size, etc.

#### Error Monitoring
- **`downloadError`**: Any error that occurred during download
- **`uploadError`**: Any error that occurred during upload

#### Authentication
- **`userID`**: The user ID extracted from the JWT token

### Methods

#### `clearData()`
- **Description**: Disconnects and clears all local PowerSync data, then reconnects
- **Usage**: Useful for resetting the sync state during development or troubleshooting

#### `formatBytes(bytes, decimals?)`
- **Parameters**:
  - `bytes`: Number of bytes to format
  - `decimals`: Number of decimal places (default: 2)
- **Returns**: Human-readable size string (e.g., "1.5 MiB")
- **Description**: Formats byte counts into readable file sizes

### Usage Examples

#### Sync Status

```vue
<script setup lang="ts">
const {
  isConnected,
  hasSynced,
  isSyncing,
  totalDownloadProgress,
  uploadQueueStats,
  bucketRows,
  totals,
  clearData
} = usePowerSyncInspectorDiagnostics();
</script>

<template>
  <div>
    <!-- Connection Status -->
    <div v-if="isConnected" class="status-connected">
      Connected {{ hasSynced ? '✅' : '⏳' }}
    </div>
    
    <!-- Sync Progress -->
    <div v-if="isSyncing">
      Syncing... {{ totalDownloadProgress }}%
    </div>
    
    <!-- Statistics -->
    <div v-if="totals">
      <p>Buckets: {{ totals.buckets }}</p>
      <p>Total Rows: {{ totals.row_count }}</p>
      <p>Data Size: {{ totals.data_size }}</p>
    </div>
    
    <!-- Upload Queue -->
    <div v-if="uploadQueueStats">
      Pending uploads: {{ uploadQueueStats.count }}
    </div>
    
    <!-- Debug Actions -->
    <button @click="clearData">Clear Data</button>
  </div>
</template>
```

#### Error Monitoring
Monitor errors in your components:

```tsx
const { downloadError, uploadError } = usePowerSyncInspectorDiagnostics();

watch([downloadError, uploadError], ([downloadErr, uploadErr]) => {
  if (downloadErr) console.error('Download failed:', downloadErr);
  if (uploadErr) console.error('Upload failed:', uploadErr);
});
```

#### Progress Feedback
Show sync progress to users:

```vue
<script setup lang="ts">
const { isSyncing, totalDownloadProgress } = usePowerSyncInspectorDiagnostics();
</script>

<template>
  <div v-if="isSyncing">
    Syncing {{ totalDownloadProgress }}%
  </div>
</template>
```

#### Upload Queue

```vue
<script setup lang="ts">
const { uploadQueueStats } = usePowerSyncInspectorDiagnostics();
</script>

<template>
  <div>
    Pending local changes to sync: {{ uploadQueueStats?.count || 0 }}
  </div>
</template>
```
