// import { fileURLToPath } from "node:url";
import {
  defineNuxtModule,
  createResolver,
  addPlugin,
  addImports,
  extendPages,
  installModule,
  addLayout,
  addComponentsDir,
} from '@nuxt/kit'
import { defu } from 'defu'
import { setupDevToolsUI } from './devtools'

// function rPath(p: string) {
//   return fileURLToPath(new URL(p, import.meta.url).toString());
// }

type JSONValue
  = | string
    | number
    | boolean
    | null
    | undefined
    | JSONObject
    | JSONArray
interface JSONObject {
  [key: string]: JSONValue
}
type JSONArray = JSONValue[]

// Module options TypeScript interface definition
export interface PowerSyncModuleOptions {
  /**
   * default powersync connection params
   *
   * @default "undefined"
   */
  defaultConnectionParams?: undefined | Record<string, JSONValue>
}

export default defineNuxtModule<PowerSyncModuleOptions>({
  meta: {
    name: 'powersync-nuxt',
    configKey: 'powersync',
  },
  // Default configuration options of the Nuxt module
  defaults: {
    defaultConnectionParams: undefined,
  },
  async setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)

    nuxt.options.runtimeConfig.public.powerSyncModuleOptions = defu(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      nuxt.options.runtimeConfig.public.powerSyncModuleOptions as any,
      {
        defaultConnectionParams: options.defaultConnectionParams,
      },
    )

    await installModule('@nuxt/devtools-ui-kit')
    await installModule('@unocss/nuxt')
    await installModule('@vueuse/nuxt')

    addPlugin(resolver.resolve('./runtime/plugin.client'))

    // expose the composables
    addImports({
      name: 'PowerSyncDatabaseWithDiagnostics',
      from: resolver.resolve(
        './runtime/utils/PowerSyncDatabaseWithDiagnostics',
      ),
    })

    addImports({
      name: 'usePowerSyncInspector',
      from: resolver.resolve('./runtime/composables/usePowerSyncInspector'),
    })

    addImports({
      name: 'usePowerSyncInspectorDiagnostics',
      from: resolver.resolve(
        './runtime/composables/usePowerSyncInspectorDiagnostics',
      ),
    })

    // From the runtime directory
    addComponentsDir({
      path: resolver.resolve('runtime/components'),
    })

    addLayout(
      resolver.resolve('./runtime/layouts/powersync-inspector-layout.vue'),
      'powersync-inspector-layout',
    )

    extendPages((pages) => {
      pages.push({
        path: '/__powersync-inspector',
        // file: resolver.resolve("#build/pages/__powersync-inspector.vue"),
        file: resolver.resolve('./runtime/pages/__powersync-inspector.vue'),
        name: 'Powersync Inspector',
      })
    })

    // Add Reka UI auto-imports for your module components
    addImports([
      // Editable components
      {
        name: 'EditableRoot',
        from: 'reka-ui',
      },
      {
        name: 'EditableArea',
        from: 'reka-ui',
      },
      {
        name: 'EditableInput',
        from: 'reka-ui',
      },
      {
        name: 'EditablePreview',
        from: 'reka-ui',
      },
      {
        name: 'EditableEditTrigger',
        from: 'reka-ui',
      },
      {
        name: 'EditableSubmitTrigger',
        from: 'reka-ui',
      },
      {
        name: 'EditableCancelTrigger',
        from: 'reka-ui',
      },
      // TanStack Table
      {
        name: 'useVueTable',
        from: '@tanstack/vue-table',
      },
      {
        name: 'FlexRender',
        from: '@tanstack/vue-table',
      },
      {
        name: 'getCoreRowModel',
        from: '@tanstack/vue-table',
      },
      {
        name: 'getSortedRowModel',
        from: '@tanstack/vue-table',
      },
      {
        name: 'getFilteredRowModel',
        from: '@tanstack/vue-table',
      },
      {
        name: 'getPaginationRowModel',
        from: '@tanstack/vue-table',
      },
    ])

    // Ensure the packages are transpiled
    nuxt.options.build.transpile = nuxt.options.build.transpile || []
    nuxt.options.build.transpile.push('reka-ui', '@tanstack/vue-table')

    setupDevToolsUI(nuxt)
  },
})
