/**
 * データベースの接続先。
 * Vercel の Storage から Turso をつなぐと TURSO_DATABASE_URL / TURSO_AUTH_TOKEN が入るので、それを優先する。
 * 無ければ DATABASE_URL（手元の SQLite ファイルなど）と DATABASE_AUTH_TOKEN。
 */
export function databaseEnv() {
  return {
    url: process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL,
    authToken:
      process.env.TURSO_AUTH_TOKEN ||
      process.env.DATABASE_AUTH_TOKEN ||
      undefined,
  };
}
