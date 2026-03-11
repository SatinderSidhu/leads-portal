import { cookies } from "next/headers";
import { prisma } from "@leads-portal/database";

interface AdminSession {
  id: string;
  name: string;
  email: string;
  username: string;
  profilePicture: string | null;
  emailSignature: string | null;
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get("admin-session");
  if (!session?.value) return null;

  // Cookie format: "userId:secret"
  const [userId, secret] = session.value.split(":");
  if (!userId || secret !== process.env.SESSION_SECRET) return null;

  const admin = await prisma.adminUser.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, username: true, active: true, profilePicture: true, emailSignature: true },
  });

  if (!admin || !admin.active) return null;

  return { id: admin.id, name: admin.name, email: admin.email, username: admin.username, profilePicture: admin.profilePicture, emailSignature: admin.emailSignature };
}
