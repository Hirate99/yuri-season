import { cloudflare } from "@cloudflare/vite-plugin";
import react from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

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
      "@worker": fileURLToPath(new URL("./worker", import.meta.url)),
    },
  },
  server: {
    port: 3000,
  },
});
