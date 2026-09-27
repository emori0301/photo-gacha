import { execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

export default function setup() {
  const dir = mkdtempSync(path.join(tmpdir(), "photogacha-test-"));
  const url = `file:${path.join(dir, "test.db")}`;
  process.env.DATABASE_URL = url;
  process.env.UPLOAD_DIR = path.join(dir, "uploads");
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: url },
    stdio: "ignore",
  });
  return () => rmSync(dir, { recursive: true, force: true });
}
