# Module Options

## `defaultConnectionParams`

The default connection parameters to use for the PowerSync database. This is crucial to share the connection params with the inspector.

```typescript
export default defineNuxtConfig({
  modules: ["powersync-nuxt"],
  powersync: {
    defaultConnectionParams: {
      // the connection params you want to share with the inspector
    },
  },
});
```