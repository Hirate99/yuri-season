import { cloudflare } from "@cloudflare/vite-plugin";
import react from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseDevVars } from "./scripts/lib/research-env";

const devVarsPath = fileURLToPath(new URL("./.dev.vars", import.meta.url));
const devVars = existsSync(devVarsPath) ? parseDevVars(readFileSync(devVarsPath, "utf8")) : {};
process.env.CLOUDFLARE_ACCESS_CLIENT_ID ??= devVars.YURI_ACCESS_CLIENT_ID;
process.env.CLOUDFLARE_ACCESS_CLIENT_SECRET ??= devVars.YURI_ACCESS_CLIENT_SECRET;

const isAdminBuild = process.env.CLOUDFLARE_ENV === "admin";

export default defineConfig({
  build: {
    assetsDir: isAdminBuild ? "admin-assets" : "assets",
  },
  plugins: [
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tanstackStart(),
    tailwindcss(),
    react(),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "~": fileURLToPath(new URL("./backend", import.meta.url)),
    },
  },
  server: {
    port: 3000,
  },
});
