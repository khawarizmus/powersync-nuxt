// import { PowerSyncDatabase } from '@powersync/web'
import { SyncClientImplementation } from '@powersync/web'
import {
  // AppSchema,
  AppSchemaWithDiagnostics,
} from '~/powersync/AppSchema'
import { SupabaseConnector } from '~/powersync/SuperbaseConnector'

export default defineNuxtPlugin({
  setup(nuxtApp) {
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

    db.connect(connector, {
      clientImplementation: SyncClientImplementation.RUST,
    })

    const { shareConnectorWithInspector } = usePowerSyncInspector()
    shareConnectorWithInspector(nuxtApp, connector)

    const plugin = createPowerSyncPlugin({ database: db })

    nuxtApp.vueApp.use(plugin)
  },
})
