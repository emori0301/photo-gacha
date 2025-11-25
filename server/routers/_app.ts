import { createTRPCRouter } from "@/lib/trpc/server";
import { imageRouter } from "./image";
import { packRouter } from "./pack";
import { collectionRouter } from "./collection";
import { userRouter } from "./user";

export const appRouter = createTRPCRouter({
  image: imageRouter,
  pack: packRouter,
  collection: collectionRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;
