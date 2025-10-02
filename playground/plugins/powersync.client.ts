import { PowerSyncDatabase } from '@powersync/web'
import { AppSchema } from '~/powersync/AppSchema'
import { SupabaseConnector } from '~/powersync/SuperbaseConnector'

export default defineNuxtPlugin({
  setup(nuxtApp) {
    const db = new PowerSyncDatabase({
      database: {
        dbFilename: 'a-db-name.sqlite',
      },
      schema: AppSchema,
    })

    const connector = new SupabaseConnector()

    db.connect(connector, {
      params: {},
    })

    const plugin = createPowerSyncPlugin({ database: db })

    nuxtApp.vueApp.use(plugin)
  },
})
