import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'

export default defineNuxtConfig({

  modules: [
    '../src/module',
    '@nuxt/eslint',
    '@nuxt/ui',
    '@nuxtjs/supabase',
  ],
  ssr: false,

  devtools: {
    enabled: true,
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    public: {
      powersyncUrl: process.env.NUXT_PUBLIC_POWERSYNC_URL,
    },
  },

  // enable hot reloading when we make changes to our module
  watch: ['../src/*', './**/*'],

  compatibilityDate: '2024-07-05',

  vite: {
    plugins: [topLevelAwait()],
    optimizeDeps: {
      exclude: ['@journeyapps/wa-sqlite', '@powersync/web'],
      include: ['@powersync/web > js-logger'], // <-- Include `js-logger` when it isn't installed and imported.
    },

    worker: {
      format: 'es',
      plugins: () => [wasm(), topLevelAwait()],
    },
  },

  eslint: {
    config: {
      stylistic: true,
    },
  },

  powersync: {
    useDiagnostics: true,
  },

  supabase: {
    url: process.env.NUXT_PUBLIC_SUPABASE_URL,
    key: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY,
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      // include: ['/protected'],
      exclude: ['/unprotected', '/public/*'],
    },
    clientOptions: {
      auth: {
        persistSession: true,
      },
    },
  },

  unocss: {
    autoImport: false,
  },
})
