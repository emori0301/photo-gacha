import { createTRPCRouter } from "@/lib/trpc/server";
import { collectionRouter } from "./collection";
import { imageRouter } from "./image";
import { packRouter } from "./pack";
import { userRouter } from "./user";

export const appRouter = createTRPCRouter({
  user: userRouter,
  image: imageRouter,
  pack: packRouter,
  collection: collectionRouter,
});

export type AppRouter = typeof appRouter;
