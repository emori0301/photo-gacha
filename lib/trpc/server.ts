import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type TRPCContext = {
  prisma: typeof prisma;
  userId: string | null;
};

export async function createTRPCContext(): Promise<TRPCContext> {
  return { prisma, userId: await getCurrentUserId() };
}

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      // 入力エラーは最初のメッセージだけを人間向けに返す
      message:
        error.cause instanceof ZodError
          ? (error.cause.issues[0]?.message ?? shape.message)
          : shape.message,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? true : null,
      },
    };
  },
});

export const createCallerFactory = t.createCallerFactory;
export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "ログインが必要です",
    });
  }
  return next({ ctx: { ...ctx, userId: ctx.userId } });
});
