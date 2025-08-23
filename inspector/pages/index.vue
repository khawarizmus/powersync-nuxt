<template>
  <div class="flex h-full justify-center items-center">
    <div class="flex flex-col gap-4 w-full max-w-md">
      <NCard class="flex flex-col gap-4 p-4">
        <h1 class="text-2xl font-bold mb-2">Connection details</h1>

        <NTextInput
          v-model="token"
          n="purple"
          icon="carbon:code-signing-service"
          placeholder="PowerSync token"
          class="w-full"
          name="token"
          type="text"
          autocomplete="token"
        />
        <NTextInput
          v-model="endpoint"
          n="purple"
          icon="carbon:api-1"
          placeholder="PowerSync endpoint"
          class="w-full"
          name="endpoint"
          type="url"
          autocomplete="url"
        />
        <div class="flex justify-end">
          <NButton n="green solid" @click="inspect">Inspect</NButton>
        </div>

        <NTip v-if="error" n="red" icon="carbon:warning-filled">
          <p v-for="e in errors" :key="e">{{ e }}</p>
        </NTip>
      </NCard>
      <NTip n="green" icon="carbon:information">
        <p>
          PowerSync token is a unique identifier that allows you to connect to
          your PowerSync instance. Learn more about tokens
          <NLink
            href="https://docs.powersync.com/installation/authentication-setup"
            target="_blank"
            >here</NLink
          >.
        </p>
      </NTip>
    </div>
  </div>
</template>

<script setup lang="ts">
import { connector } from "@/utils/powersync/ConnectionManager";

const endpoint = ref("");
const token = ref("");
const errors = ref<string[]>([]);
const error = ref<boolean>(false);

watch(token, (newToken) => {
  endpoint.value =
    endpoint.value === ""
      ? getTokenEndpoint(newToken ?? "") ?? ""
      : endpoint.value;
});

async function inspect() {
  errors.value = [];
  error.value = false;

  if (!token.value) {
    errors.value.push("Token is required");
    error.value = true;
    return;
  }

  if (!endpoint.value) {
    errors.value.push("Endpoint is required");
    error.value = true;
    return;
  }

  // connect to PowerSync
  await connector.signIn({
    token: token.value,
    endpoint: endpoint.value,
  });

  navigateTo("/health");
}

function getTokenEndpoint(token: string): string | null {
  try {
    const [_head, body, _signature] = token.split(".");
    const payload = JSON.parse(atob(body ?? ""));
    const aud = payload.aud as string | string[] | undefined;
    const audiences = Array.isArray(aud) ? aud : [aud];

    // Prioritize public powersync URL
    for (const aud of audiences) {
      if (aud?.match(/^https?:.*\.journeyapps\.com/)) {
        return aud;
      }
    }

    // Fallback to any URL
    for (const aud of audiences) {
      if (aud?.match(/^https?:/)) {
        return aud;
      }
    }

    return null;
  } catch {
    return null;
  }
}
</script>
