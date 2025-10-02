<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

<script setup lang="ts">
useHead({
  meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
  link: [{ rel: 'icon', href: '/favicon.ico' }],
  htmlAttrs: {
    lang: 'en',
  },
})

const title = 'PowerSync Playground'
const description
  = 'Demo of a simple todo list app using PowerSync and Supabase.'

useSeoMeta({
  title,
  ogTitle: title,
  description,
  ogDescription: description,
})

const appIsReady = ref(false)

provide('appIsReady', readonly(appIsReady))

const powerSync = usePowerSync()
const syncStatus = usePowerSyncStatus()

const user = useSupabaseUser()

watch(user, () => {
  if (user.value) {
    if (syncStatus.value.hasSynced) {
      appIsReady.value = true
    }
    else {
      powerSync.value.waitForFirstSync().then(() => {
        appIsReady.value = true
      })
    }
  }
  else {
    powerSync.value.disconnect()
    appIsReady.value = true
  }
}, { immediate: true })

console.log('User', user.value)
</script>
