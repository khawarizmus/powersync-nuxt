import {
  defineNuxtModule,
  createResolver,
  addPlugin,
  addImports,
} from "@nuxt/kit";
import { setupDevToolsUI } from "./devtools";
import { defu } from "defu";

// Module options TypeScript interface definition
export interface PowersyncModuleOptions {
  /**
   * default powersync connection params
   *
   * @default "undefined"
   */
  defaultConnectionParams?: undefined | Record<string, unknown>;
}

export default defineNuxtModule<PowersyncModuleOptions>({
  meta: {
    name: "powersync-nuxt",
    configKey: "powersync",
  },
  // Default configuration options of the Nuxt module
  defaults: {
    defaultConnectionParams: undefined,
  },
  setup(options, nuxt) {
    const resolver = createResolver(import.meta.url);

    nuxt.options.runtimeConfig.public.powersyncOptions = defu(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      nuxt.options.runtimeConfig.public.powersyncOptions as any,
      {
        defaultConnectionParams: options.defaultConnectionParams,
      }
    );

    // Add the plugin to expose options
    addPlugin(resolver.resolve("./runtime/plugin.client"));

    addImports({
      name: "usePowerSyncDevtools",
      from: resolver.resolve("./runtime/composables/usePowerSyncDevtools"),
    });

    setupDevToolsUI(nuxt, resolver);
  },
});
