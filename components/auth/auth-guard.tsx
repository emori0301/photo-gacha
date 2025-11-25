"use client";

import { useSession } from "next-auth/react";
import { LoginForm } from "./login-form";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">読み込み中...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700 shadow-xl max-w-md w-full">
          <h2 className="text-2xl font-bold mb-4 text-white text-center">ログインが必要です</h2>
          <LoginForm />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

