import path from "node:path";
import { fileURLToPath } from "node:url";
import lit from "@astrojs/lit";
import { defineConfig } from "astro/config";

const here = path.dirname(fileURLToPath(import.meta.url));

function normalizeBase(input) {
  const trimmed = input.trim();
  if (!trimmed) {
    return "/";
  }
  if (trimmed === "./") {
    return "./";
  }
  if (trimmed.endsWith("/")) {
    return trimmed;
  }
  return `${trimmed}/`;
}

const envBase = process.env.OPENCLAW_CONTROL_UI_BASE_PATH?.trim();
const base = envBase ? normalizeBase(envBase) : "./";

// https://astro.build/config
export default defineConfig({
  integrations: [lit()],

  base,
  outDir: path.resolve(here, "../dist/control-ui"),
  publicDir: path.resolve(here, "public"),

  vite: {
    resolve: {
      alias: {
        "@": path.resolve(here, "src"),
        "@ui": path.resolve(here, "src/ui"),
      },
    },
    optimizeDeps: {
      include: ["lit/directives/repeat.js"],
      exclude: [
        "@webcomponents/template-shadowroot",
        "@lit-labs/ssr-client/lit-element-hydrate-support.js",
      ],
    },
  },

  server: {
    host: true,
    port: 5173,
  },

  output: "static",
});
