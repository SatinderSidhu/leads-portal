import { prisma } from "@leads-portal/database";
import { cookies } from "next/headers";

const COOKIE_NAME = "customer-session";
const SESSION_SECRET = process.env.SESSION_SECRET || "dev-secret";

export interface AppFactorySession {
  id: string;
  email: string;
  name: string;
}

export async function getSession(): Promise<AppFactorySession | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(COOKIE_NAME);
    if (!sessionCookie?.value) return null;

    const [userId, secret] = sessionCookie.value.split(":");
    if (!userId || secret !== SESSION_SECRET) return null;

    const user = await prisma.customerUser.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });

    return user;
  } catch {
    return null;
  }
}

export function createSessionCookie(userId: string): {
  name: string;
  value: string;
  options: Record<string, unknown>;
} {
  return {
    name: COOKIE_NAME,
    value: `${userId}:${SESSION_SECRET}`,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    },
  };
}

export function clearSessionCookie(): {
  name: string;
  value: string;
  options: Record<string, unknown>;
} {
  return {
    name: COOKIE_NAME,
    value: "",
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      maxAge: 0,
      path: "/",
    },
  };
}
