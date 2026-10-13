import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    // CLI（migrate など）が使う手元の SQLite。
    // Vercel では接続先が TURSO_DATABASE_URL になり DATABASE_URL が無いので、prisma generate が止まらないよう既定値を置く
    url: process.env.DATABASE_URL || "file:./dev.db",
  },
});
