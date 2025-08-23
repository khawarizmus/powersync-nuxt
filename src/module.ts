import { defineNuxtModule, addPlugin, createResolver } from "@nuxt/kit";
import { setupDevToolsUI } from "./devtools";
import type { NitroFetchOptions } from "nitropack";

// Module options TypeScript interface definition
export interface PowersyncModuleOptions {
  /**
   * Enable Nuxt Devtools integration
   *
   * @default true
   */
  inspector: boolean;

  /**
   * The URL of the Powersync server
   *
   * @default "http://localhost:3000" // TODO: add a sensible default
   */
  powersyncKeysEndpoint?: string | NitroFetchOptions<string, "get" | "post">;
}

export default defineNuxtModule<PowersyncModuleOptions>({
  meta: {
    name: "powersync-nuxt",
    configKey: "powersync",
  },
  // Default configuration options of the Nuxt module
  defaults: {
    inspector: true,
  },
  setup(options, nuxt) {
    const resolver = createResolver(import.meta.url);

    // Do not add the extension since the `.ts` will be transpiled to `.mjs` after `npm run prepack`
    addPlugin(resolver.resolve("./runtime/plugin"));

    if (options.inspector) setupDevToolsUI(nuxt, resolver);
  },
});
