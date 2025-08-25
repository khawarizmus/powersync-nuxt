import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

export default defineNuxtConfig({
  ssr: false,

  devtools: {
    enabled: true,
  },

  watch: ["../src/*"],

  modules: ["../src/module"],

  powersync: {
    defaultConnectionParams: {
      // add the default connection params
    },
  },

  vite: {
    server: {
      hmr: {
        // Instead of go through proxy, we directly connect real port of the client app
        clientPort: +(process.env.PORT || 3300),
      },
    },

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

  compatibilityDate: "2024-08-21",
});
