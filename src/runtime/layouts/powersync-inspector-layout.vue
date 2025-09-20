<template>
  <div
    flex="~ relative col"
    p="6"
    h="screen"
    n-bg="base"
    class="ps-inspector-ui"
  >
    <h1 flex="~ gap-2 items-center" mb="3" text="3xl" font="bold">
      <img
        src="https://cdn.prod.website-files.com/67eea61902e19994e7054ea0/67f910109a12edc930f8ffb6_powersync-icon.svg"
        alt="Powersync"
        w="10"
        h="10"
      />
      Powersync Inspector
    </h1>
    <slot />
  </div>
</template>
