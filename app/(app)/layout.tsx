import { LoginScreen } from "@/components/auth/login-screen";
import { AppShell } from "@/components/shell/app-shell";
import { getCurrentUserId } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userId = await getCurrentUserId();
  if (!userId) return <LoginScreen />;
  return <AppShell>{children}</AppShell>;
}
