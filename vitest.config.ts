import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { env: { GUARDIAN_DATABASE_DRIVER: "sqlite", GUARDIAN_STORAGE_DRIVER: "database" } },
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
});
