# Getting Started

This guide will walk you through the steps to get started with PowerSync Inspector in your Nuxt project.

## Prerequisites
::: tip
This guide assumes PowerSync is installed and configured in your Nuxt project.

If you haven't, you can find the setup guide [here](/guide/setting-up-powersync).
:::

::: info
This module works with `Nuxt 4` and should work with `Nuxt 3` but have not been tested.

Support for Nuxt 2 is not guaranteed or planned.
:::

## Install

```bash
pnpm install --save-dev powersync-nuxt @iconify-json/carbon
```

Add the module to your `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  modules: ["powersync-nuxt"],
});
```

<!-- Or use Nuxt cli to install the module:

```bash
nuxi module add powersync-nuxt
``` -->

At this point you are all set to use the module composables but for a complete setup with the PowerSync inspector, you need to follow the steps below.

## Connect to PowerSync

Inside your PowerSync plugin, use the `PowerSyncDatabaseWithDiagnostics` class instead of `PowerSyncDatabase`. And share the connector with the inspector.

::: code-group

```typescript [powersync-plugin.client.ts]
import { PowerSyncDatabaseWithDiagnostics } from "powersync-nuxt";

export default defineNuxtPlugin({
  setup(nuxtApp) {
    const db = new PowerSyncDatabase({// [!code --]
    const db = new PowerSyncDatabaseWithDiagnostics({ // [!code ++]
      database: {
        dbFilename: "your-db-filename.sqlite",
      },
      schema: yourSchema,
    });

    // Connect with your backend connector
    await db.connect(yourConnector, {
      params: {
        // your connection params. make sure to share these in the module config
      },
    });

    // Share the connector with the inspector
    const { shareConnectorWithInspector } = usePowerSyncInspector(); // [!code ++]
    shareConnectorWithInspector(nuxtApp, connector); // [!code ++]

    // register powersync vue plugin
    const plugin = createPowerSyncPlugin({ database: db });

    nuxtApp.vueApp.use(plugin);
  },
});
```

:::

## Extend Schema

Extend your existing schema with the diagnostics schema to collect diagnostics data.

```typescript
const { diagnosticsSchema } = usePowerSyncInspector();

// Combine with your app schema
const combinedSchema = new Schema([
  ...yourSchema.tables,
  ...diagnosticsSchema.tables,
]);
```

## Setup Config

Configure default connection parameters in `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  modules: ["@powersync/nuxt"],
  powersync: {
    defaultConnectionParams: {
      // the connection params you want to share with the inspector
    },
  },
});
```

✅ All Done! You can now see the PowerSync inspector in your browser at `http://localhost:3000/__powersync-inspector`.

::: warning
The inspector might not work properly with multiple tabs. Make sure to open the inspector in a new tab.
:::

## Known Issues

PowerSync Inspector relies on `unocss` as a transitive dependency. It might clash with your existing setup for example if you use Tailwind CSS.

To fix this, you can add the following to your `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  unocss: {
    icons: true,
    blocklist: [/\$\{.*\}/],
    content: {
      pipeline: {
        exclude: [
          "./layouts/*/**",
          "./pages/*/**",
          "./components/*/**",
          "./composables/*/**",
          "./utils/*/**",
          "./types/*/**",
        ],
      },
    },
  },
});
```
