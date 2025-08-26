import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Powersync Nuxt",
  description:
    "Build local-first and offline first apps with Powersync on Nuxt",
  themeConfig: {
    logo: "https://cdn.prod.website-files.com/67eea61902e19994e7054ea0/67f910109a12edc930f8ffb6_powersync-icon.svg",
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: "Home", link: "/" },
      { text: "Guide", link: "/guide/getting-started" },
      { text: "API", link: "/api/module-options" },
    ],

    sidebar: [
      {
        text: "Guide",
        items: [
          { text: "Getting Started", link: "/guide/getting-started" },
          { text: "Setting up PowerSync", link: "/guide/setting-up-powersync" },
        ],
      },
      {
        text: "Features",
        items: [
          {
            text: "PowerSync Inspector",
            link: "/features/powersync-inspector",
          },
        ],
      },
      {
        text: "API",
        items: [
          { text: "Module Options", link: "/api/module-options" },
          { text: "Composables", link: "/api/composables" },
          { text: "Classes", link: "/api/classes" },
        ],
      },
    ],

    socialLinks: [
      { icon: "github", link: "https://github.com/khawarizmus/powersync-nuxt" },
    ],
  },

  markdown: {
    theme: { dark: "material-theme-palenight", light: "github-light" },
  },
});
