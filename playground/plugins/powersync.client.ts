// import { PowerSyncDatabase } from '@powersync/web'
import { SyncClientImplementation } from '@powersync/web'
import {
  // AppSchema,
  AppSchemaWithDiagnostics,
} from '~/powersync/AppSchema'
import { SupabaseConnector } from '~/powersync/SuperbaseConnector'

export default defineNuxtPlugin({
  async setup(nuxtApp) {
    // const db = new PowerSyncDatabase({
    //   database: {
    //     dbFilename: 'a-db-name.sqlite',
    //   },
    //   schema: AppSchema,
    // })

    const db = new PowerSyncDatabaseWithDiagnostics({
      database: {
        dbFilename: 'a-db-name.sqlite',
      },
      schema: AppSchemaWithDiagnostics,
    })

    const connector = new SupabaseConnector()

    await db.connect(connector, {
      clientImplementation: SyncClientImplementation.RUST,
    })

    const plugin = createPowerSyncPlugin({ database: db })

    nuxtApp.vueApp.use(plugin)
  },
})
