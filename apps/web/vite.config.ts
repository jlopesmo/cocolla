import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

// Build options are environment-driven so the default `npm run dev` / `npm run build`
// behaviour is unchanged. A static export for a sub-path host (e.g. the LopesMoreno
// App Hub at /apps/projects/cocolla/) sets COCOLLA_BASE; see docs/decisions/0009.
//   COCOLLA_BASE       public base path, default "/"; must start and end with "/"
//   COCOLLA_SOURCEMAP  "true" (default) or "false"
//   COCOLLA_OUT_DIR    output directory, default ../../dist/web (relative to apps/web)
const base = process.env.COCOLLA_BASE ?? "/";
if (!/^\/(?:[A-Za-z0-9._~-]+\/)*$/.test(base) || base.includes("/../") || base.includes("/./")) {
  throw new Error(`COCOLLA_BASE must be an absolute path that starts and ends with "/" (got ${JSON.stringify(base)})`);
}
const sourcemapEnv = process.env.COCOLLA_SOURCEMAP ?? "true";
if (sourcemapEnv !== "true" && sourcemapEnv !== "false") {
  throw new Error(`COCOLLA_SOURCEMAP must be "true" or "false" (got ${JSON.stringify(sourcemapEnv)})`);
}

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  base,
  plugins: [react()],
  // Module worker bundled as its own ES chunk (see ImageImportDialog).
  worker: { format: "es" },
  build: {
    outDir: process.env.COCOLLA_OUT_DIR ?? "../../dist/web",
    emptyOutDir: true,
    sourcemap: sourcemapEnv === "true",
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
  },
});
