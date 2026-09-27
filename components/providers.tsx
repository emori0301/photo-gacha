"use client";

import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { SessionProvider, signOut } from "next-auth/react";
import { useState } from "react";
import { Toaster } from "sonner";
import superjson from "superjson";
import { trpc } from "@/lib/trpc/client";

/** セッション切れ（DB リセット等）を検知したらログイン画面へ戻す */
function handleUnauthorized(error: unknown) {
  if (error instanceof TRPCClientError && error.data?.code === "UNAUTHORIZED") {
    void signOut({ callbackUrl: "/" });
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({ onError: handleUnauthorized }),
        mutationCache: new MutationCache({ onError: handleUnauthorized }),
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: (count, error) =>
              !(
                error instanceof TRPCClientError &&
                (error.data?.httpStatus ?? 500) < 500
              ) && count < 2,
          },
        },
      }),
  );
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [httpBatchLink({ url: "/api/trpc", transformer: superjson })],
    }),
  );

  return (
    <SessionProvider refetchOnWindowFocus={false}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          {children}
          <Toaster
            visibleToasts={3}
            position="top-center"
            offset={72}
            mobileOffset={{ top: 64 }}
            toastOptions={{
              classNames: {
                toast:
                  "!rounded-2xl !border-2 !border-ink !bg-card !text-ink !shadow-hard !font-sans",
                description: "!text-ink-2",
                error: "!bg-[#fff1ee]",
                success: "!bg-[#f0faf3]",
              },
            }}
          />
        </QueryClientProvider>
      </trpc.Provider>
    </SessionProvider>
  );
}
