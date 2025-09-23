<template>
  <div
    flex="~ relative col"
    p="6"
    h="screen"
    n-bg="base"
    class="ps-inspector-ui"
  >
    <!-- Header with title and dark toggle -->
    <div flex="~ items-center justify-between" mb="3">
      <h1 flex="~ gap-2 items-center" text="3xl" font="bold">
        <img
          src="https://cdn.prod.website-files.com/67eea61902e19994e7054ea0/67f910109a12edc930f8ffb6_powersync-icon.svg"
          alt="Powersync"
          w="10"
          h="10"
        />
        PowerSync Inspector
      </h1>

      <!-- Dark Mode Toggle -->
      <NDarkToggle>
        <NButton n="sm" :icon="isDark ? 'carbon:moon' : 'carbon:sun'">
          {{ isDark ? "Dark" : "Light" }}
        </NButton>
      </NDarkToggle>
    </div>

    <slot />
  </div>
</template>

<script setup lang="ts">
// Dark mode state - this will be managed by NDarkToggle
const isDark = ref(false);

// Watch for system/manual dark mode changes and update our state
if (process.client) {
  // Check initial state
  isDark.value = document.documentElement.classList.contains("dark");

  // Watch for changes
  const observer = new MutationObserver(() => {
    isDark.value = document.documentElement.classList.contains("dark");
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });

  onUnmounted(() => {
    observer.disconnect();
  });
}
</script>
