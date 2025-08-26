<!--
Get your module up and running quickly.

Find and replace all on all files (CMD+SHIFT+F):
- Name: PowerSync Nuxt
- Package name: powersync-nuxt
- Description: Powersync Nuxt module
-->

# PowerSync Nuxt

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

Powersync Nuxt module integrated with the [Nuxt Devtools](https://github.com/nuxt/devtools).

- [✨ &nbsp;Release Notes](/CHANGELOG.md)
- [📖 &nbsp;Documentation](https://powersync-nuxt.netlify.app)

## Features

<!-- Highlight some of the features your module provide here -->
- 🔍 Built-in Diagnostics
- 🗄️ Data Inspection
- ⚡ Useful Composables

## Quick Setup

1. Add `powersync-nuxt` dependency to your project

```bash
# Using pnpm
pnpm add -D powersync-nuxt @iconify-json/carbon

# Using yarn
yarn add --dev powersync-nuxt @iconify-json/carbon

# Using npm
npm install --save-dev powersync-nuxt @iconify-json/carbon
```

2. Add `powersync-nuxt` to the `modules` section of `nuxt.config.ts`

```js
export default defineNuxtConfig({
  modules: [
    'powersync-nuxt'
  ],
  powersync: {
    defaultConnectionParams: {
      // the connection params you want to share with the inspector
    },
  },
})
```

Check the [Getting Started](https://powersync-nuxt.netlify.app/guide/getting-started) guide for more details.

## Documentation

- [Getting Started](https://powersync-nuxt.netlify.app/guide/getting-started)
- [API](https://powersync-nuxt.netlify.app/api/module-options)
- [Features](https://powersync-nuxt.netlify.app/features/powersync-inspector)

## Development

```bash
# Install dependencies
npm install

# Generate type stubs
npm run dev:prepare

# Develop with playground, with devtools client ui
npm run dev

# Develop with playground, with bundled client ui
npm run play:prod

# Run ESLint
npm run lint

# Run Vitest
npm run test
npm run test:watch

# Release new version
npm run release
```

## Local Testing

If the playground is not enough for you, you can test the module locally by cloning this repo and pointing the nuxt app you want to test to the local module.

don't forget to add a watcher for the module for hot reloading.

example (in your nuxt app):

```ts
import { defineNuxtConfig } from "nuxt/config";

export default defineNuxtConfig({
  modules: ["../../my-location/powersync-nuxt/src/*"],
  watch: ["../../my-location/powersync-nuxt/src/*"],
});
```


<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/powersync-nuxt/latest.svg?style=flat&colorA=18181B&colorB=28CF8D
[npm-version-href]: https://npmjs.com/package/powersync-nuxt

[npm-downloads-src]: https://img.shields.io/npm/dm/powersync-nuxt.svg?style=flat&colorA=18181B&colorB=28CF8D
[npm-downloads-href]: https://npmjs.com/package/powersync-nuxt

[license-src]: https://img.shields.io/npm/l/powersync-nuxt.svg?style=flat&colorA=18181B&colorB=28CF8D
[license-href]: https://npmjs.com/package/powersync-nuxt

[nuxt-src]: https://img.shields.io/badge/Nuxt-18181B?logo=nuxt.js
[nuxt-href]: https://nuxt.com
