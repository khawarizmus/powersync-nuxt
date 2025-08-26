// import { fileURLToPath } from "node:url";
import {
  defineNuxtModule,
  createResolver,
  addPlugin,
  addImports,
  extendPages,
  installModule,
} from "@nuxt/kit";
import { defu } from "defu";
import { setupDevToolsUI } from "./devtools";

// function rPath(p: string) {
//   return fileURLToPath(new URL(p, import.meta.url).toString());
// }

type JSONValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | JSONObject
  | JSONArray;
interface JSONObject {
  [key: string]: JSONValue;
}
type JSONArray = JSONValue[];

// Module options TypeScript interface definition
export interface PowerSyncModuleOptions {
  /**
   * default powersync connection params
   *
   * @default "undefined"
   */
  defaultConnectionParams?: undefined | Record<string, JSONValue>;
}

export default defineNuxtModule<PowerSyncModuleOptions>({
  meta: {
    name: "powersync-nuxt",
    configKey: "powersync",
  },
  // Default configuration options of the Nuxt module
  defaults: {
    defaultConnectionParams: undefined,
  },
  async setup(options, nuxt) {
    const resolver = createResolver(import.meta.url);

    nuxt.options.runtimeConfig.public.powerSyncModuleOptions = defu(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      nuxt.options.runtimeConfig.public.powerSyncModuleOptions as any,
      {
        defaultConnectionParams: options.defaultConnectionParams,
      }
    );

    await installModule("@nuxt/devtools-ui-kit");
    await installModule("@vueuse/nuxt");

    addPlugin(resolver.resolve("./runtime/plugin.client"));

    // expose the composables
    addImports({
      name: "PowerSyncDatabaseWithDiagnostics",
      from: resolver.resolve(
        "./runtime/utils/PowerSyncDatabaseWithDiagnostics"
      ),
    });

    addImports({
      name: "usePowerSyncInspector",
      from: resolver.resolve("./runtime/composables/usePowerSyncInspector"),
    });

    addImports({
      name: "usePowerSyncInspectorDiagnostics",
      from: resolver.resolve(
        "./runtime/composables/usePowerSyncInspectorDiagnostics"
      ),
    });

    extendPages((pages) => {
      pages.push({
        path: "/__powersync-inspector",
        // file: resolver.resolve("#build/pages/__powersync-inspector.vue"),
        file: resolver.resolve("./runtime/pages/__powersync-inspector.vue"),
        name: "Powersync Inspector",
      });
    });

    setupDevToolsUI(nuxt);
  },
});
