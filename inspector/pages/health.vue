<script setup lang="ts">
import { useDevtoolsClient } from "@nuxt/devtools-kit/iframe-client";
import { clearData, db, sync } from "@/utils/powersync/ConnectionManager";

const client = useDevtoolsClient();
</script>

<template>
  <div class="relative n-bg-base flex flex-col h-screen">
    <div v-if="client" class="flex flex-col gap-2">
      {{ sync?.syncStatus }}
      <NTip
        :n="`${sync?.syncStatus.connected ? 'green' : 'red'}`"
        :icon="`${
          sync?.syncStatus.connected
            ? 'carbon:plug-filled'
            : 'carbon:connection-signal-off'
        }`"
      >
        Powersync is
        {{ sync?.syncStatus.connected ? "connected" : "disconnected" }}
      </NTip>
    </div>
    <div v-else>
      <NTip n="yellow">
        Failed to connect to the client. Did you open this page inside Nuxt
        DevTools?
      </NTip>
    </div>
  </div>
</template>
