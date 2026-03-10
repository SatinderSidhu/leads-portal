import { cookies } from "next/headers";
import { prisma } from "@leads-portal/database";

export interface CustomerSession {
  id: string;
  email: string;
  name: string;
  leadIds: string[];
}

export async function getCustomerSession(): Promise<CustomerSession | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get("customer-session");
  if (!session?.value) return null;

  const [userId, secret] = [
    session.value.split(":")[0],
    session.value.split(":").slice(1).join(":"),
  ];

  if (!userId || secret !== process.env.SESSION_SECRET) return null;

  const user = await prisma.customerUser.findUnique({
    where: { id: userId },
  });

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    leadIds: (user.leadIds as string[]) || [],
  };
}
