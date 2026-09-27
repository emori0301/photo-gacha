"use client";

import {
  BookOpen,
  Camera,
  LogOut,
  type LucideIcon,
  Palette,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { PointsPill } from "./points-pill";

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "ガチャ", icon: Sparkles },
  { href: "/collection", label: "図鑑", icon: BookOpen },
  { href: "/studio", label: "工房", icon: Palette },
  { href: "/earn", label: "ポイント", icon: Camera },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: me } = trpc.user.me.useQuery();
  const [signingOut, setSigningOut] = useState(false);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b-2 border-ink bg-paper/92 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:gap-4">
          <Link href="/" aria-label="PhotoGacha ホーム" className="shrink-0">
            <Logo />
          </Link>

          <nav aria-label="メイン" className="mx-auto hidden md:block">
            <ul className="flex items-center gap-1 rounded-full border-2 border-ink bg-card p-1">
              {NAV.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-bold transition-colors",
                        active
                          ? "bg-ink text-paper"
                          : "text-ink-2 hover:text-ink",
                      )}
                    >
                      <item.icon className="size-4" aria-hidden />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="ml-auto flex items-center gap-1 sm:gap-2 md:ml-0">
            <Link
              href="/earn"
              aria-label={`所持ポイント ${me?.points ?? "—"}pt（ポイントを貯める）`}
            >
              <PointsPill points={me?.points} />
            </Link>
            <div className="hidden items-center gap-1 lg:flex">
              <span className="max-w-32 truncate pl-2 text-sm font-bold text-ink-2">
                {me?.name}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="ログアウト"
              title="ログアウト"
              disabled={signingOut}
              onClick={() => {
                setSigningOut(true);
                void signOut({ callbackUrl: "/" });
              }}
            >
              <LogOut />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-28 md:pb-16">
        {children}
      </main>

      <nav
        aria-label="メイン"
        className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-ink bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <ul className="grid grid-cols-4">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-16 flex-col items-center justify-center gap-0.5 text-[11px] font-bold transition-colors",
                    active ? "text-red" : "text-ink-3",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-7 w-12 place-items-center rounded-full transition-colors",
                      active && "bg-red text-white",
                    )}
                  >
                    <item.icon className="size-[18px]" aria-hidden />
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
