"use client";

import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useId, useState } from "react";
import { RarityTag } from "@/components/cards/rarity";
import { Logo } from "@/components/shell/logo";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { DEFAULT_USER_POINTS } from "@/lib/constants/points";
import type { Rarity } from "@/lib/constants/rarity";
import { cn } from "@/lib/utils";

type Mode = "login" | "register";

const FAN: { rarity: Rarity; bg: string; rotate: string; label: string }[] = [
  {
    rarity: "R",
    bg: "bg-mint",
    rotate: "-rotate-12 -translate-x-24 translate-y-4",
    label: "いつもの道",
  },
  {
    rarity: "SSR",
    bg: "bg-[#e7dcff]",
    rotate: "rotate-10 translate-x-24 translate-y-4",
    label: "夕焼けの屋上",
  },
  {
    rarity: "UR",
    bg: "bg-[#ffe08a]",
    rotate: "-rotate-2",
    label: "はじめての一枚",
  },
];

function DecorCard({
  rarity,
  bg,
  label,
  className,
}: {
  rarity: Rarity;
  bg: string;
  label: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "absolute w-40 rounded-2xl border-2 border-ink bg-card p-2 pb-3 shadow-hard sm:w-44",
        className,
      )}
    >
      <div
        className={cn(
          "relative aspect-4/5 overflow-hidden rounded-[10px] border-2 border-ink",
          bg,
        )}
      >
        {/* 写真の代わりの抽象的な風景 */}
        <div className="absolute right-4 bottom-0 left-4 h-1/3 rounded-t-full border-2 border-b-0 border-ink bg-card/70" />
        <div className="absolute top-5 right-5 size-8 rounded-full border-2 border-ink bg-card" />
        <RarityTag
          rarity={rarity}
          size="sm"
          className="absolute top-1.5 left-1.5"
        />
      </div>
      <p className="mt-2 truncate text-sm font-bold">{label}</p>
    </div>
  );
}

export function LoginScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = useId();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const result = await signIn("credentials", {
        mode,
        email,
        password,
        name: mode === "register" ? name : "",
        redirect: false,
      });
      if (!result || result.error) {
        setError(
          result?.error && result.error !== "CredentialsSignin"
            ? result.error
            : "ログインできませんでした。もう一度お試しください",
        );
        setPending(false);
        return;
      }
      router.refresh();
    } catch {
      setError("通信に失敗しました。時間をおいて試してください");
      setPending(false);
    }
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden border-r-2 border-ink bg-red lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Logo className="text-white [&_span]:text-white" />
        <div className="relative mx-auto my-8 h-80 w-full max-w-md">
          <div className="absolute inset-x-0 top-6 flex justify-center">
            {FAN.map((c) => (
              <DecorCard
                key={c.rarity}
                rarity={c.rarity}
                bg={c.bg}
                label={c.label}
                className={c.rotate}
              />
            ))}
          </div>
        </div>
        <div className="text-white">
          <p className="font-display text-4xl leading-tight">
            撮った写真が、
            <br />
            ガチャになる。
          </p>
          <p className="mt-4 max-w-sm text-white/85">
            写真をカードにして、パックを作って、みんなで引き合おう。 UR
            を引き当てるのは、あなたの一枚かもしれない。
          </p>
        </div>
      </section>

      <section className="flex flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo />
            <p className="mt-3 font-display text-2xl leading-snug">
              撮った写真が、ガチャになる。
            </p>
          </div>

          <Segmented
            label="ログイン方法"
            value={mode}
            onChange={(m) => {
              setMode(m);
              setError(null);
            }}
            options={[
              { value: "login", label: "ログイン" },
              { value: "register", label: "はじめる" },
            ]}
            className="mb-6 w-full [&>button]:flex-1"
          />

          <form
            onSubmit={submit}
            className="space-y-4 rounded-3xl border-2 border-ink bg-card p-6 shadow-hard-lg"
            noValidate
          >
            <h1 className="font-display text-xl">
              {mode === "login" ? "おかえりなさい" : "アカウントを作る"}
            </h1>
            {mode === "register" && (
              <p className="text-sm text-ink-2">
                登録すると {DEFAULT_USER_POINTS}pt もらえます。さっそく 2
                回引けます。
              </p>
            )}

            {mode === "register" && (
              <Field label="ニックネーム" htmlFor={`${id}-name`}>
                <Input
                  id={`${id}-name`}
                  autoComplete="nickname"
                  value={name}
                  maxLength={24}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="カードに作者名として表示されます"
                  required
                />
              </Field>
            )}
            <Field label="メールアドレス" htmlFor={`${id}-email`}>
              <Input
                id={`${id}-email`}
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </Field>
            <Field
              label="パスワード"
              htmlFor={`${id}-password`}
              hint={mode === "register" ? "8 文字以上" : undefined}
            >
              <Input
                id={`${id}-password`}
                type="password"
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
              />
            </Field>

            {error && (
              <p
                role="alert"
                className="rounded-xl border-2 border-red-deep bg-[#fff1ee] px-3 py-2 text-sm font-medium text-red-deep"
              >
                {error}
              </p>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={
                pending ||
                !email ||
                password.length < 8 ||
                (mode === "register" && !name.trim())
              }
            >
              {pending
                ? "確認中…"
                : mode === "login"
                  ? "ログイン"
                  : "登録してはじめる"}
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}
