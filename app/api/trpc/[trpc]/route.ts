import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { createTRPCContext } from "@/lib/trpc/server";
import { appRouter } from "@/server/routers/_app";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: createTRPCContext,
    onError:
      process.env.NODE_ENV === "development"
        ? ({ path, error }) => {
            if (error.code === "INTERNAL_SERVER_ERROR") {
              console.error(`tRPC error on ${path}:`, error);
            }
          }
        : undefined,
  });

export { handler as GET, handler as POST };
