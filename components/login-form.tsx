"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        name: name || undefined,
        redirect: false,
      });

      if (result?.error) {
        toast.error(
          activeTab === "login"
            ? "ログインに失敗しました"
            : "登録に失敗しました",
        );
      } else {
        toast.success(
          activeTab === "login" ? "ログインしました" : "登録しました",
        );
        // ホーム画面に遷移
        window.location.href = "/";
      }
    } catch (error) {
      toast.error("エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => setActiveTab(value as "login" | "register")}
      className="w-full"
    >
      <TabsList className="grid w-full grid-cols-2 mb-6 bg-zinc-800/50">
        <TabsTrigger
          value="login"
          className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-yellow-500"
        >
          ログイン
        </TabsTrigger>
        <TabsTrigger
          value="register"
          className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-yellow-500"
        >
          新規登録
        </TabsTrigger>
      </TabsList>
      <TabsContent value="login">
        <form onSubmit={handleSubmit} className="space-y-6 max-w-md mx-auto">
          <div>
            <Label
              htmlFor="login-email"
              className="text-zinc-200 mb-3 block text-base font-semibold"
            >
              メールアドレス
            </Label>
            <Input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-zinc-800/50 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
              placeholder="example@email.com"
            />
          </div>
          <div>
            <Label
              htmlFor="login-name"
              className="text-zinc-200 mb-3 block text-base font-semibold"
            >
              名前（オプション）
            </Label>
            <Input
              id="login-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-zinc-800/50 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
              placeholder="あなたの名前"
            />
          </div>
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 hover:from-amber-600 hover:via-yellow-600 hover:to-amber-600 text-white shadow-xl shadow-amber-500/50 disabled:opacity-50 transition-all duration-300 py-6 text-lg font-semibold"
          >
            {isLoading ? "ログイン中..." : "ログイン"}
          </Button>
        </form>
      </TabsContent>
      <TabsContent value="register">
        <form onSubmit={handleSubmit} className="space-y-6 max-w-md mx-auto">
          <div>
            <Label
              htmlFor="register-email"
              className="text-zinc-200 mb-3 block text-base font-semibold"
            >
              メールアドレス
            </Label>
            <Input
              id="register-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-zinc-800/50 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
              placeholder="example@email.com"
            />
          </div>
          <div>
            <Label
              htmlFor="register-name"
              className="text-zinc-200 mb-3 block text-base font-semibold"
            >
              名前
            </Label>
            <Input
              id="register-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="bg-zinc-800/50 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
              placeholder="あなたの名前"
            />
            <p className="text-xs text-zinc-400 mt-2">
              新規登録時は名前の入力が必須です
            </p>
          </div>
          <Button
            type="submit"
            disabled={isLoading || !name}
            className="w-full bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 hover:from-amber-600 hover:via-yellow-600 hover:to-amber-600 text-white shadow-xl shadow-amber-500/50 disabled:opacity-50 transition-all duration-300 py-6 text-lg font-semibold"
          >
            {isLoading ? "登録中..." : "新規登録"}
          </Button>
        </form>
      </TabsContent>
    </Tabs>
  );
}
