import type { PrismaClient } from "@/lib/generated/prisma/client";

/** 画面に出す作者名（名前が無ければメールアドレスの @ より前） */
export function displayName(user: {
  name: string | null;
  email: string | null;
}) {
  return user.name || user.email?.split("@")[0] || "名無し";
}

export async function creatorNames(
  prisma: Pick<PrismaClient, "user">,
  ids: (string | null)[],
) {
  const unique = [...new Set(ids.filter((id): id is string => !!id))];
  if (unique.length === 0) return new Map<string, string>();
  const users = await prisma.user.findMany({
    where: { id: { in: unique } },
    select: { id: true, name: true, email: true },
  });
  return new Map(users.map((u) => [u.id, displayName(u)]));
}
