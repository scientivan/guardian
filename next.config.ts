import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3", "pg", "tesseract.js"],
  outputFileTracingIncludes: {"/*":["./src/server/postgres-worker.cjs","./supabase/certs/prod-ca-2021.crt","./node_modules/tesseract.js/**/*","./node_modules/tesseract.js-core/**/*","./node_modules/@tesseract.js-data/eng/4.0.0/*","./fixtures/**/*"]},
};

export default nextConfig;
