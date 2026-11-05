// Build the existing scroll-preview storefront and the isolated admin demo.
// This config is used ONLY by the protected Render preview service.
import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        storefront: fileURLToPath(new URL("../index.html", import.meta.url)),
        admin: fileURLToPath(new URL("./admin/index.html", import.meta.url))
      }
    }
  }
});
