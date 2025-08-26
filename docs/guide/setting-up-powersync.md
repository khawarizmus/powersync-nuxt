# Setting up PowerSync

This guide will walk you through the steps to set up PowerSync in your Nuxt project.

## Install

```bash
pnpm install @powersync/web @powersync/vue @powersync/kysely-driver @journeyapps/wa-sqlite
```
Install the dev dependencies:

```bash
pnpm install --save-dev vite-plugin-top-level-await vite-plugin-wasm
```

## Setup

### Setup Vite

In your `nuxt.config.ts`, configure the vite plugins:

```typescript
  // configuring vite for wasm and top level await to support powersync
  vite: {
    plugins: [topLevelAwait()],
    optimizeDeps: {
      exclude: ["@journeyapps/wa-sqlite", "@powersync/web"],
      include: ["@powersync/web > js-logger"], // <-- Include `js-logger` when it isn't installed and imported.
    },
    worker: {
      format: "es",
      plugins: () => [wasm(), topLevelAwait()],
    },
  },
```

### Create your Schema

Create a file called `AppSchema.ts` and add your schema to it.

::: code-group

```typescript [AppSchema.ts]
import { column, Schema, Table } from '@powersync/web';

const lists = new Table({
  created_at: column.text,
  name: column.text,
  owner_id: column.text
});

const todos = new Table(
  {
    list_id: column.text,
    created_at: column.text,
    completed_at: column.text,
    description: column.text,
    created_by: column.text,
    completed_by: column.text,
    completed: column.integer
  },
  { indexes: { list: ['list_id'] } }
);

export const AppSchema = new Schema({
  todos,
  lists
});

// For types
export type Database = (typeof AppSchema)['types'];
export type TodoRecord = Database['todos'];
// OR:
// export type Todo = RowType<typeof todos>;
export type ListRecord = Database['lists'];
```
:::

::: tip

Learn more about how to create your schema [here](https://docs.powersync.com/client-sdk-references/javascript-web#1-define-the-schema).
:::

### Create your connector

Create a file called `PowerSyncConnector.ts` and add your connector to it.

::: code-group

```typescript [PowerSyncConnector.ts]
import { UpdateType, type PowerSyncBackendConnector } from "@powersync/web";

export class PowerSyncConnector implements PowerSyncBackendConnector {
  async fetchCredentials() {
    // Implement fetchCredentials to obtain a JWT from your authentication service.
    // See https://docs.powersync.com/installation/authentication-setup
    // If you're using Supabase or Firebase, you can re-use the JWT from those clients, see
    // - https://docs.powersync.com/installation/authentication-setup/supabase-auth
    // - https://docs.powersync.com/installation/authentication-setup/firebase-auth
    return {
        endpoint: '[Your PowerSync instance URL or self-hosted endpoint]',
        // Use a development token (see Authentication Setup https://docs.powersync.com/installation/authentication-setup/development-tokens) to get up and running quickly
        token: 'An authentication token'
    };
  }

  async uploadData(db: any) {
      // Implement uploadData to send local changes to your backend service.
    // You can omit this method if you only want to sync data from the database to the client

    // See example implementation here: https://docs.powersync.com/client-sdk-references/javascript-web#3-integrate-with-your-backend
    // see demos here: https://github.com/powersync-ja/powersync-js/tree/main/demos
    return;
  }
}
```
:::

::: tip

Learn more about how to create your connector [here](https://docs.powersync.com/client-sdk-references/javascript-web#3-integrate-with-your-backend).
:::


### Create your PowerSync plugin

Finally putting everything together, create a [plugin](https://nuxt.com/docs/4.x/guide/directory-structure/app/plugins) called `powersync.client.ts` to setup PowerSync.

::: code-group

```typescript [powersync.client.ts]
import { createPowerSyncPlugin } from "@powersync/vue";
import { PowerSyncDatabase } from "@powersync/web";
import { AppSchema } from "~/powersync/AppSchema";
import { PowerSyncConnector } from "~/powersync/PowerSyncConnector";


export default defineNuxtPlugin({
  setup(nuxtApp) {

    const db = new PowerSyncDatabase({
      database: {
        dbFilename: "a-db-name.sqlite",
      },
      schema: AppSchema,
      flags: {
        broadcastLogs: true,
      },
    });

    const connector = new PowerSyncConnector();

    db.connect(connector, {
      params: {
        // add any params to the connection here
      },
    });

    const plugin = createPowerSyncPlugin({ database: db });

    nuxtApp.vueApp.use(plugin);
  },
});

```

:::

### Bonus: Kysely

You can use Kysely as your ORM to interact with the database. Setting up Kysely is straightforward.

::: code-group

```typescript [usePowerSyncKysely.ts]
import { wrapPowerSyncWithKysely } from "@powersync/kysely-driver";

import { type Database } from "../powersync/AppSchema";
import { usePowerSync } from "@powersync/vue";

export const usePowerSyncKysely = () => {
  const powerSync = usePowerSync();

  const db = wrapPowerSyncWithKysely<Database>(powerSync.value);

  return { db };
};
```
:::

You can now use the `db` object to interact with the database.

```typescript
const { db } = usePowerSyncKysely();

const users = await db.selectFrom("users").selectAll().execute();
```

## Setup PowerSync Inspector

To setup the PowerSync inspector, you need to follow the steps in the [getting started](/guide/getting-started) guide.