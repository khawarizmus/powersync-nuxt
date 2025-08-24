<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
const route = useRoute();
const authenticated = computed(() => route.name !== "index");

const { status, db } = useConnectionManager();

// const unregister = db.registerListener({
//   statusChanged(syncStatus) {
//     console.log("triggred app", syncStatus);
//     status.value = syncStatus;
//   },
// });

if (authenticated.value && !status.value?.hasSynced) {
  await db.value?.waitForFirstSync();
}

// onUnmounted(() => {
//   unregister();
// });
</script>
