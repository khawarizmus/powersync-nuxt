import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { Nuxt } from "nuxt/schema";
import type { Resolver } from "@nuxt/kit";
import { startSubprocess } from "@nuxt/devtools-kit";

const DEVTOOLS_UI_ROUTE = "/__powersync-inspector";
const DEVTOOLS_UI_LOCAL_PORT = 3300;

export function setupDevToolsUI(nuxt: Nuxt, resolver: Resolver) {
  // const prodClientPath = resolver.resolve("../dist/inspector");
  // const devClientPath = resolver.resolve("./inspector");
  // const isProductionBuild = existsSync(prodClientPath);
  // const clientPath = isProductionBuild ? prodClientPath : devClientPath;

  const clientPath = resolver.resolve("./inspector");
  const isProductionBuild = existsSync(clientPath);

  if (!isProductionBuild && nuxt.options.dev) {
    const inspectorPath = resolve(resolver.resolve("../"), "inspector");

    console.log("Starting inspector client in dev mode");
    startSubprocess(
      {
        command: "npx",
        args: ["nuxi", "dev", "--port", String(DEVTOOLS_UI_LOCAL_PORT)],
        cwd: inspectorPath,
      },
      {
        id: "powersync-inspector:client",
        name: "PowerSync Inspector Client Dev",
      }
    );
  }

  // Serve production-built client (used when package is published)
  if (isProductionBuild) {
    nuxt.hook("vite:serverCreated", async (server) => {
      const sirv = await import("sirv").then((r) => r.default || r);
      server.middlewares.use(
        DEVTOOLS_UI_ROUTE,
        sirv(clientPath, { dev: true, single: true })
      );
    });
  }
  // In local development, start a separate Nuxt Server and proxy to serve the client
  else {
    nuxt.hook("vite:extendConfig", (config) => {
      config.server = config.server || {};
      config.server.proxy = config.server.proxy || {};
      config.server.proxy[DEVTOOLS_UI_ROUTE] = {
        target:
          "http://localhost:" + DEVTOOLS_UI_LOCAL_PORT + DEVTOOLS_UI_ROUTE,
        changeOrigin: true,
        followRedirects: true,
        rewrite: (path) => path.replace(DEVTOOLS_UI_ROUTE, ""),
      };
    });
  }

  nuxt.hook("devtools:customTabs", (tabs) => {
    tabs.push({
      // unique identifier
      name: "powersync-inspector",
      // title to display in the tab
      title: "Powersync Inspector",
      // any icon from Iconify, or a URL to an image
      icon: "https://cdn.prod.website-files.com/67eea61902e19994e7054ea0/67f910109a12edc930f8ffb6_powersync-icon.svg",
      // iframe view
      view: {
        type: "iframe",
        src: DEVTOOLS_UI_ROUTE,
      },
    });
  });
}
