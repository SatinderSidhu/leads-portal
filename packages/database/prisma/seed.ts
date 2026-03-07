import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.adminUser.findUnique({
    where: { username: "admin" },
  });

  if (existing) {
    console.log("Admin user already exists, skipping seed.");
    return;
  }

  const hashedPassword = await bcrypt.hash("admin", 10);

  const admin = await prisma.adminUser.create({
    data: {
      name: "Admin",
      email: "admin@leadsportal.com",
      username: "admin",
      password: hashedPassword,
      active: true,
    },
  });

  console.log(`Seeded admin user: ${admin.username} (${admin.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
