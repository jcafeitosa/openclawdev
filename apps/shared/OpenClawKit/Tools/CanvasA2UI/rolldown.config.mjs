import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "rolldown";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../../../..");
const fromHere = (p) => path.resolve(here, p);
const outputFile = path.resolve(repoRoot, "src", "canvas-host", "a2ui", "a2ui.bundle.js");

// Use Node.js module resolution to find packages reliably.
// In git worktrees, node_modules may be hoisted to the main repository
// root rather than the worktree directory, so hardcoded paths break.
const require = createRequire(import.meta.url);
const resolvePackageDir = (pkg) => {
  const resolved = require.resolve(pkg);
  let dir = path.dirname(resolved);
  const parts = pkg.startsWith("@") ? pkg.split("/").slice(0, 2) : [pkg];
  const needle = parts.join(path.sep);
  while (dir !== path.dirname(dir)) {
    if (dir.endsWith(needle) || dir.endsWith(parts.join("/"))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  throw new Error(`Cannot resolve package directory for "${pkg}"`);
};

const a2uiLitDist = path.resolve(repoRoot, "vendor/a2ui/renderers/lit/dist/src");
const a2uiThemeContext = path.resolve(a2uiLitDist, "0.8/ui/context/theme.js");

const litContextDir = resolvePackageDir("@lit/context");
const litLabsSignalsDir = resolvePackageDir("@lit-labs/signals");
const litDir = resolvePackageDir("lit");

export default defineConfig({
  input: fromHere("bootstrap.js"),
  experimental: {
    attachDebugInfo: "none",
  },
  treeshake: false,
  resolve: {
    alias: {
      "@a2ui/lit": path.resolve(a2uiLitDist, "index.js"),
      "@a2ui/lit/ui": path.resolve(a2uiLitDist, "0.8/ui/ui.js"),
      "@openclaw/a2ui-theme-context": a2uiThemeContext,
      "@lit/context": path.resolve(litContextDir, "index.js"),
      "@lit/context/": litContextDir + "/",
      "@lit-labs/signals": path.resolve(litLabsSignalsDir, "index.js"),
      "@lit-labs/signals/": litLabsSignalsDir + "/",
      lit: path.resolve(litDir, "index.js"),
      "lit/": litDir + "/",
    },
  },
  output: {
    file: outputFile,
    format: "esm",
    codeSplitting: false,
    sourcemap: false,
  },
});
