# Classes

## PowerSyncDatabaseWithDiagnostics

An extended PowerSync database class that includes diagnostic capabilities and multi-tab support for use with the PowerSync Inspector.

### Usage

```typescript
import { PowerSyncDatabaseWithDiagnostics } from "powersync-nuxt";

const db = new PowerSyncDatabaseWithDiagnostics({
  database: {
    dbFilename: "your-db-filename.sqlite",
  },
});
```

### Features

- **Multi-tab Support**: Automatically enables multi-tab support for better development experience
- **Diagnostics Recording**: Uses `RecordingStorageAdapter` to capture sync operations for inspection
- **Enhanced VFS**: Uses cooperative sync VFS for improved multi-tab compatibility
- **Schema Management**: Integrates with dynamic schema management for inspector features
- **Broadcast Logs**: Enables log broadcasting for better diagnostics
