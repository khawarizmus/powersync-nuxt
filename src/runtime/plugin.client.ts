import { defineNuxtPlugin, useRuntimeConfig } from '#app'

export default defineNuxtPlugin((nuxtApp) => {
  // Expose PowerSync module options globally
  const runtimeConfig = useRuntimeConfig()

  nuxtApp.vueApp.config.globalProperties.$powerSyncModuleOptions
    = runtimeConfig.public.powerSyncModuleOptions
})
