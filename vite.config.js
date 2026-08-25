import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import tailwindcss from "@tailwindcss/vite";
import { copyFileSync, chmodSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

/** Кладёт сервер и запускалки в dist — папка dist становится самодостаточным приложением. */
const copyRuntime = {
  name: "copy-runtime",
  closeBundle() {
    const dist = resolve(here, "dist");
    mkdirSync(dist, { recursive: true });
    for (const f of ["server.mjs", "start.command", "start.bat"]) {
      const src = resolve(here, f);
      if (existsSync(src)) copyFileSync(src, resolve(dist, f));
    }
    try {
      chmodSync(resolve(dist, "start.command"), 0o755);
      chmodSync(resolve(dist, "start.bat"), 0o755);
    } catch {
      /* не критично */
    }
  },
};

export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile(), copyRuntime],
  build: {
    base: "./",
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 100000000,
    cssCodeSplit: false,
  },
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    hmr: {
      port: 3000,
    },
  },
});
