import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@/server/routers/_app";

export const trpc = createTRPCReact<AppRouter>();

/** tRPC のエラーから、画面に出してよいメッセージを取り出す */
export function errorMessage(
  error: unknown,
  fallback = "エラーが発生しました",
) {
  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message: unknown }).message);
    // ネットワーク断などの英語メッセージはそのまま出さない
    if (message && !/fetch|network|JSON|Unexpected/i.test(message)) {
      return message;
    }
  }
  return fallback;
}
