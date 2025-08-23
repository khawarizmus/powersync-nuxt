export default defineNuxtConfig({
  devtools: {
    enabled: true,
  },

  watch: ["../src/module/*", "../inspector/*"],

  modules: ["../src/module"],

  powersync: {
    inspector: true,
  },

  compatibilityDate: "2024-08-21",
});
