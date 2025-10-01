<script setup lang="ts">
const client = useSupabaseClient();
const user = useSupabaseUser();

const logout = async () => {
  await client.auth.signOut();
  navigateTo("/login");
};
</script>

<template>
  <UHeader :toggle="false">
    <template #left>
      <!--  -->
    </template>

    <template #right>
      <UColorModeButton variant="link" />

      <UButton v-if="user" variant="link" color="gray" @click="logout">
        Logout
      </UButton>
    </template>
  </UHeader>
</template>
