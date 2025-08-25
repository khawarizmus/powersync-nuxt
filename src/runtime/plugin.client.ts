import { defineNuxtPlugin } from "#app";

export default defineNuxtPlugin((nuxtApp) => {
  // Expose PowerSync module options globally
  const runtimeConfig = useRuntimeConfig();

  nuxtApp.vueApp.config.globalProperties.$powersyncOptions =
    runtimeConfig.public.powersyncOptions;
});
