"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { ImageUpload } from "@/components/image/image-upload";
import { PackCreator } from "@/components/pack/pack-creator";
import { PackSelector } from "@/components/pack/pack-selector";
import { PackList } from "@/components/pack/pack-list";
import { CollectionView } from "@/components/collection/collection-view";
import { PointEarner } from "@/components/points/point-earner";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import {
  Sparkles,
  Package,
  Image as ImageIcon,
  FolderKanban,
  Gift,
  Home as HomeIcon,
  LogOut,
  User,
  Coins,
} from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";

type SessionUser = {
  id?: string;
  email?: string | null;
  name?: string | null;
};

type Session = {
  user?: SessionUser;
} | null;

function getUserId(session: Session): string {
  if (session?.user?.id) {
    return session.user.id;
  }
  if (typeof window !== "undefined") {
    let userId = localStorage.getItem("userId");
    if (!userId) {
      userId = `user-${Date.now()}`;
      localStorage.setItem("userId", userId);
    }
    return userId;
  }
  return "user-1";
}

export default function HomePage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<
    | "home"
    | "images"
    | "packs"
    | "pack-management"
    | "gacha"
    | "collection"
    | "points"
  >("home");
  const userId = getUserId(session);
  const { data: points } = trpc.user.getPoints.useQuery(
    { userId },
    { enabled: !!session },
  );

  // ログイン前はホームタブ以外に遷移できないようにする
  const handleTabChange = (tab: typeof activeTab) => {
    if (!session && tab !== "home") {
      return;
    }
    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-slate-950">
      <header className="bg-zinc-900/90 backdrop-blur-md border-b border-zinc-800/50 shadow-2xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-amber-400 animate-pulse drop-shadow-lg" />
              <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 bg-clip-text text-transparent drop-shadow-lg">
                PhotoGacha
              </h1>
            </div>
            {session ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-amber-400 bg-gradient-to-r from-zinc-800/80 to-zinc-700/80 px-4 py-2 rounded-lg border border-amber-400/20 shadow-lg">
                  <Coins className="w-5 h-5 drop-shadow-md" />
                  <span className="font-bold text-lg">{points ?? 0}pt</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-200">
                  <User className="w-4 h-4" />
                  <span>{session.user?.name || session.user?.email}</span>
                </div>
                <Button
                  onClick={() => signOut()}
                  variant="ghost"
                  className="text-zinc-300 hover:text-white hover:bg-zinc-800/50"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  ログアウト
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <nav className="bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800/50 sticky top-[73px] z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-2 py-3 overflow-x-auto">
            <Button
              variant={activeTab === "home" ? "default" : "ghost"}
              onClick={() => handleTabChange("home")}
              className={`transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "home"
                  ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-lg shadow-amber-500/50"
                  : "text-zinc-300 hover:text-white hover:bg-zinc-800/50"
              }`}
            >
              <HomeIcon className="w-4 h-4 mr-2" />
              Home
            </Button>
            {session && (
              <>
                <Button
                  variant={activeTab === "packs" ? "default" : "ghost"}
                  onClick={() => handleTabChange("packs")}
                  className={`transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === "packs"
                      ? "bg-slate-700 text-white shadow-lg"
                      : "text-zinc-300 hover:text-white hover:bg-zinc-800/50"
                  }`}
                >
                  <Package className="w-4 h-4 mr-2" />
                  Create Pack
                </Button>
                <Button
                  variant={
                    activeTab === "pack-management" ? "default" : "ghost"
                  }
                  onClick={() => handleTabChange("pack-management")}
                  className={`transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === "pack-management"
                      ? "bg-slate-700 text-white shadow-lg"
                      : "text-zinc-300 hover:text-white hover:bg-zinc-800/50"
                  }`}
                >
                  <Package className="w-4 h-4 mr-2" />
                  Manage Packs
                </Button>
                <Button
                  variant={activeTab === "images" ? "default" : "ghost"}
                  onClick={() => handleTabChange("images")}
                  className={`transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === "images"
                      ? "bg-slate-700 text-white shadow-lg"
                      : "text-zinc-300 hover:text-white hover:bg-zinc-800/50"
                  }`}
                >
                  <ImageIcon className="w-4 h-4 mr-2" />
                  Images
                </Button>
                <Button
                  variant={activeTab === "gacha" ? "default" : "ghost"}
                  onClick={() => handleTabChange("gacha")}
                  className={`transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === "gacha"
                      ? "bg-slate-700 text-white shadow-lg"
                      : "text-zinc-300 hover:text-white hover:bg-zinc-800/50"
                  }`}
                >
                  <Gift className="w-4 h-4 mr-2" />
                  Open Pack
                </Button>
                <Button
                  variant={activeTab === "collection" ? "default" : "ghost"}
                  onClick={() => handleTabChange("collection")}
                  className={`transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === "collection"
                      ? "bg-slate-700 text-white shadow-lg"
                      : "text-zinc-300 hover:text-white hover:bg-zinc-800/50"
                  }`}
                >
                  <FolderKanban className="w-4 h-4 mr-2" />
                  Collection
                </Button>
                <Button
                  variant={activeTab === "points" ? "default" : "ghost"}
                  onClick={() => handleTabChange("points")}
                  className={`transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === "points"
                      ? "bg-slate-700 text-white shadow-lg"
                      : "text-zinc-300 hover:text-white hover:bg-zinc-800/50"
                  }`}
                >
                  <Coins className="w-4 h-4 mr-2" />
                  Earn Points
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="relative max-w-7xl mx-auto px-4 py-8">
        {activeTab === "home" && (
          <div className="space-y-8">
            {!session ? (
              <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-800/80 backdrop-blur-sm rounded-2xl p-8 border border-zinc-800/50 shadow-2xl max-w-md mx-auto">
                <h2 className="text-2xl font-bold mb-4 text-white text-center">
                  ログイン
                </h2>
                <LoginForm />
              </div>
            ) : (
              <div className="text-center space-y-8 py-16">
                <div className="space-y-4">
                  <h2 className="text-5xl font-bold text-white">
                    PhotoGachaへようこそ！
                  </h2>
                  <p className="text-xl text-zinc-200 max-w-2xl mx-auto">
                    PhotoGachaは、画像を集めて楽しむガチャアプリです。
                    <br />
                    パックを開封して、レアなカードを集めましょう！
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
                  <Button
                    onClick={() => setActiveTab("gacha")}
                    size="lg"
                    className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white shadow-xl shadow-amber-500/50 text-lg px-8 py-6"
                  >
                    <Gift className="w-6 h-6 mr-2" />
                    カードを獲得する
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "images" && session && (
          <div className="space-y-8">
            <section className="bg-gradient-to-br from-zinc-900/80 to-zinc-800/80 backdrop-blur-sm rounded-xl p-6 border border-zinc-800/50 shadow-2xl">
              <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-2">
                <ImageIcon className="w-6 h-6" />
                画像を登録
              </h2>
              <ImageUpload userId={userId} />
            </section>
          </div>
        )}

        {activeTab === "packs" && session && (
          <div className="space-y-8">
            <section className="bg-gradient-to-br from-zinc-900/80 to-zinc-800/80 backdrop-blur-sm rounded-xl p-6 border border-zinc-800/50 shadow-2xl">
              <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-2">
                <Package className="w-6 h-6" />
                パックを作成
              </h2>
              <PackCreator userId={userId} />
            </section>
          </div>
        )}

        {activeTab === "pack-management" && session && (
          <div className="space-y-8">
            <PackList />
          </div>
        )}

        {activeTab === "gacha" && session && (
          <div className="space-y-8">
            <section className="bg-gradient-to-br from-zinc-900/80 to-zinc-800/80 backdrop-blur-sm rounded-xl p-6 border border-zinc-800/50 shadow-2xl">
              <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-2">
                <Gift className="w-6 h-6" />
                カード獲得
              </h2>
              <PackSelector userId={userId} />
            </section>
          </div>
        )}

        {activeTab === "collection" && session && (
          <div>
            <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-2">
              <FolderKanban className="w-6 h-6" />
              マイコレクション
            </h2>
            <CollectionView userId={userId} />
          </div>
        )}

        {activeTab === "points" && session && (
          <div className="space-y-8">
            <section className="bg-gradient-to-br from-zinc-900/80 to-zinc-800/80 backdrop-blur-sm rounded-xl p-6 border border-zinc-800/50 shadow-2xl">
              <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-2">
                <Coins className="w-6 h-6" />
                ポイント獲得
              </h2>
              <PointEarner userId={userId} />
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
