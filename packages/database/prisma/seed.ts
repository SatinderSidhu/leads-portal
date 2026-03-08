import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function seedAdminUser() {
  const existing = await prisma.adminUser.findUnique({
    where: { username: "admin" },
  });

  if (existing) {
    console.log("Admin user already exists, skipping.");
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

interface TemplateSeed {
  title: string;
  subject: string;
  body: string;
  purpose: "WELCOME" | "FOLLOW_UP" | "REMINDER" | "NOTIFICATION" | "PROMOTIONAL" | "OTHER";
  tags: string[];
  notes: string | null;
}

const emailTemplates: TemplateSeed[] = [
  {
    title: "KitLabs Introduction & Discovery Session",
    subject: "Let's Bring Your Vision to Life — KitLabs",
    body: `<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
  <div style="text-align: center; padding: 30px 20px; background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); border-radius: 8px 8px 0 0;">
    <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">KitLabs Inc.</h1>
    <p style="color: #bfdbfe; margin: 8px 0 0; font-size: 14px;">Technology Solutions That Drive Results</p>
  </div>

  <div style="padding: 32px 28px; background: #ffffff; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
    <p style="font-size: 16px; line-height: 1.6; margin-top: 0;">Hi <strong>{{customerName}}</strong>,</p>

    <p style="font-size: 15px; line-height: 1.7;">Thank you for your interest in <strong>{{projectName}}</strong>. We're excited to learn more about your project and explore how KitLabs can help turn your vision into reality.</p>

    <p style="font-size: 15px; line-height: 1.7;">At <strong>KitLabs</strong>, we specialize in building high-quality digital solutions tailored to your business needs. Here's what we bring to the table:</p>

    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <tr>
        <td style="padding: 12px 16px; background: #f0f7ff; border-radius: 6px; vertical-align: top; width: 50%;">
          <strong style="color: #1e3a5f; font-size: 14px;">🌐 Web Development</strong>
          <p style="margin: 6px 0 0; font-size: 13px; color: #555; line-height: 1.5;">Custom websites, web applications, and portals built with modern frameworks.</p>
        </td>
        <td style="width: 12px;"></td>
        <td style="padding: 12px 16px; background: #f0f7ff; border-radius: 6px; vertical-align: top; width: 50%;">
          <strong style="color: #1e3a5f; font-size: 14px;">📱 Mobile Apps</strong>
          <p style="margin: 6px 0 0; font-size: 13px; color: #555; line-height: 1.5;">Native and cross-platform mobile applications for iOS and Android.</p>
        </td>
      </tr>
      <tr><td colspan="3" style="height: 12px;"></td></tr>
      <tr>
        <td style="padding: 12px 16px; background: #f0f7ff; border-radius: 6px; vertical-align: top;">
          <strong style="color: #1e3a5f; font-size: 14px;">🤖 AI & Automation</strong>
          <p style="margin: 6px 0 0; font-size: 13px; color: #555; line-height: 1.5;">Intelligent solutions powered by AI to streamline your business processes.</p>
        </td>
        <td style="width: 12px;"></td>
        <td style="padding: 12px 16px; background: #f0f7ff; border-radius: 6px; vertical-align: top;">
          <strong style="color: #1e3a5f; font-size: 14px;">🎨 UI/UX Design</strong>
          <p style="margin: 6px 0 0; font-size: 13px; color: #555; line-height: 1.5;">User-centered design that delivers intuitive and engaging experiences.</p>
        </td>
      </tr>
    </table>

    <p style="font-size: 15px; line-height: 1.7;">We'd love to schedule a <strong>free discovery session</strong> to understand your goals, discuss your project requirements, and outline a clear path forward — no commitment required.</p>

    <div style="text-align: center; margin: 28px 0;">
      <a href="https://www.kitlabs.us/book-us/" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 6px; font-size: 15px; font-weight: 600; letter-spacing: 0.3px;">Schedule a Discovery Session</a>
    </div>

    <p style="font-size: 15px; line-height: 1.7;">In the meantime, feel free to explore our work and learn more about us at <a href="https://www.kitlabs.us" style="color: #2563eb; text-decoration: none; font-weight: 500;">kitlabs.us</a>.</p>

    <p style="font-size: 15px; line-height: 1.7; margin-bottom: 0;">We look forward to connecting with you!</p>
  </div>

  <div style="padding: 24px 28px; background: #f9fafb; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="margin: 0; font-size: 14px; color: #555; font-weight: 600;">Warm regards,</p>
    <p style="margin: 4px 0 0; font-size: 14px; color: #333; font-weight: 700;">The KitLabs Team</p>
    <p style="margin: 2px 0 0; font-size: 13px; color: #888;">
      <a href="https://www.kitlabs.us" style="color: #2563eb; text-decoration: none;">www.kitlabs.us</a>
    </p>
  </div>
</div>`,
    purpose: "WELCOME",
    tags: ["introduction", "welcome", "discovery", "kitlabs"],
    notes: "Default system template — professional introduction email sent to new leads. Includes KitLabs service overview and CTA to book a discovery session.",
  },
  {
    title: "KitLabs Follow-Up — Portfolio Showcase",
    subject: "See What We've Built — KitLabs Portfolio",
    body: `<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
  <!-- Header with Logo -->
  <div style="text-align: center; padding: 28px 20px; background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); border-radius: 8px 8px 0 0;">
    <img src="https://www.kitlabs.us/wp-content/uploads/2025/02/FINAL-LOGO-KITLABS-USA.png" alt="KitLabs Inc." style="height: 48px; margin-bottom: 8px;" />
    <p style="color: #bfdbfe; margin: 0; font-size: 13px; letter-spacing: 0.5px;">Technology Solutions That Drive Results</p>
  </div>

  <!-- Body -->
  <div style="padding: 32px 28px; background: #ffffff; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
    <p style="font-size: 16px; line-height: 1.6; margin-top: 0;">Hi <strong>{{customerName}}</strong>,</p>

    <p style="font-size: 15px; line-height: 1.7;">I wanted to follow up on <strong>{{projectName}}</strong> and share some of our recent work so you can see the quality and range of solutions we deliver at KitLabs.</p>

    <p style="font-size: 15px; line-height: 1.7; margin-bottom: 24px;">Below are a few projects from our portfolio across different industries:</p>

    <!-- Portfolio Item 1: Care Partners -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      <tr>
        <td style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 0; overflow: hidden;">
          <img src="https://www.kitlabs.us/wp-content/uploads/2025/02/cpp-mockup.webp" alt="Care Partners Project" style="width: 100%; display: block; border-radius: 8px 8px 0 0;" />
          <div style="padding: 16px 20px;">
            <h3 style="margin: 0 0 6px; font-size: 16px; color: #1e3a5f;">Care Partners Project</h3>
            <p style="margin: 0; font-size: 13px; color: #6b7280; line-height: 1.5;">
              <span style="display: inline-block; background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; margin-bottom: 4px;">Healthcare</span><br />
              A comprehensive healthcare platform connecting patients with care providers through an intuitive digital experience.
            </p>
          </div>
        </td>
      </tr>
    </table>

    <!-- Portfolio Item 2: Overdims -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      <tr>
        <td style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 0; overflow: hidden;">
          <img src="https://www.kitlabs.us/wp-content/uploads/2025/09/Overdims-App-1.jpg" alt="Overdims" style="width: 100%; display: block; border-radius: 8px 8px 0 0;" />
          <div style="padding: 16px 20px;">
            <h3 style="margin: 0 0 6px; font-size: 16px; color: #1e3a5f;">Overdims</h3>
            <p style="margin: 0; font-size: 13px; color: #6b7280; line-height: 1.5;">
              <span style="display: inline-block; background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; margin-bottom: 4px;">Transportation &amp; Logistics</span><br />
              A powerful logistics application streamlining operations for the transportation industry with real-time tracking and management tools.
            </p>
          </div>
        </td>
      </tr>
    </table>

    <!-- Portfolio Item 3: WhenWorx -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      <tr>
        <td style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 0; overflow: hidden;">
          <img src="https://www.kitlabs.us/wp-content/uploads/2025/02/whenworx-front-thmb.webp" alt="WhenWorx" style="width: 100%; display: block; border-radius: 8px 8px 0 0;" />
          <div style="padding: 16px 20px;">
            <h3 style="margin: 0 0 6px; font-size: 16px; color: #1e3a5f;">WhenWorx</h3>
            <p style="margin: 0; font-size: 13px; color: #6b7280; line-height: 1.5;">
              <span style="display: inline-block; background: #d1fae5; color: #065f46; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; margin-bottom: 4px;">Business Apps</span><br />
              A smart workforce management platform that simplifies scheduling, task assignments, and team coordination for growing businesses.
            </p>
          </div>
        </td>
      </tr>
    </table>

    <!-- Portfolio Item 4: Life Activated Brands -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      <tr>
        <td style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 0; overflow: hidden;">
          <img src="https://www.kitlabs.us/wp-content/uploads/2023/07/Frame-1791-1.png" alt="Life Activated Brands" style="width: 100%; display: block; border-radius: 8px 8px 0 0;" />
          <div style="padding: 16px 20px;">
            <h3 style="margin: 0 0 6px; font-size: 16px; color: #1e3a5f;">Life Activated Brands</h3>
            <p style="margin: 0; font-size: 13px; color: #6b7280; line-height: 1.5;">
              <span style="display: inline-block; background: #ede9fe; color: #5b21b6; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; margin-bottom: 4px;">Business Apps</span><br />
              A feature-rich e-commerce and brand management platform enabling seamless product showcasing, ordering, and customer engagement.
            </p>
          </div>
        </td>
      </tr>
    </table>

    <!-- Portfolio Item 5: Bring The Fun -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      <tr>
        <td style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 0; overflow: hidden;">
          <img src="https://www.kitlabs.us/wp-content/uploads/2023/03/BTF-Main.webp" alt="Bring The Fun" style="width: 100%; display: block; border-radius: 8px 8px 0 0;" />
          <div style="padding: 16px 20px;">
            <h3 style="margin: 0 0 6px; font-size: 16px; color: #1e3a5f;">Bring The Fun</h3>
            <p style="margin: 0; font-size: 13px; color: #6b7280; line-height: 1.5;">
              <span style="display: inline-block; background: #fce7f3; color: #9d174d; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; margin-bottom: 4px;">Entertainment</span><br />
              An engaging entertainment app bringing interactive, fun experiences to users through a polished mobile-first design.
            </p>
          </div>
        </td>
      </tr>
    </table>

    <!-- View Full Portfolio Link -->
    <div style="text-align: center; margin: 8px 0 24px;">
      <a href="https://www.kitlabs.us/portfolio/" style="color: #2563eb; font-size: 14px; font-weight: 600; text-decoration: none;">View our full portfolio &rarr;</a>
    </div>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />

    <p style="font-size: 15px; line-height: 1.7;">We'd love to walk you through these projects and discuss how we can apply the same level of quality and care to <strong>{{projectName}}</strong>.</p>

    <p style="font-size: 15px; line-height: 1.7;">Let's book a quick <strong>discovery call</strong> — no obligation, just a conversation to explore how we can help.</p>

    <!-- CTA Button -->
    <div style="text-align: center; margin: 28px 0;">
      <a href="https://www.kitlabs.us/book-us/" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 6px; font-size: 15px; font-weight: 600; letter-spacing: 0.3px;">Book a Discovery Call</a>
    </div>

    <p style="font-size: 15px; line-height: 1.7; margin-bottom: 0;">Looking forward to hearing from you!</p>
  </div>

  <!-- Footer -->
  <div style="padding: 24px 28px; background: #f9fafb; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="margin: 0; font-size: 14px; color: #555; font-weight: 600;">Best regards,</p>
    <p style="margin: 4px 0 0; font-size: 14px; color: #333; font-weight: 700;">The KitLabs Team</p>
    <p style="margin: 2px 0 0; font-size: 13px; color: #888;">
      <a href="https://www.kitlabs.us" style="color: #2563eb; text-decoration: none;">www.kitlabs.us</a> &nbsp;|&nbsp;
      <a href="https://www.kitlabs.us/portfolio/" style="color: #2563eb; text-decoration: none;">Portfolio</a>
    </p>
  </div>
</div>`,
    purpose: "FOLLOW_UP",
    tags: ["follow-up", "portfolio", "showcase", "discovery"],
    notes: "Follow-up email showcasing KitLabs portfolio with screenshots from 5 real projects (Care Partners, Overdims, WhenWorx, Life Activated Brands, Bring The Fun). Includes CTA to book a discovery call.",
  },
];

async function seedEmailTemplates() {
  for (const tpl of emailTemplates) {
    const existing = await prisma.emailTemplate.findFirst({
      where: { title: tpl.title },
    });

    if (existing) {
      console.log(`Email template "${tpl.title}" already exists, skipping.`);
      continue;
    }

    const created = await prisma.emailTemplate.create({
      data: {
        title: tpl.title,
        subject: tpl.subject,
        body: tpl.body,
        purpose: tpl.purpose,
        tags: tpl.tags,
        notes: tpl.notes,
        createdBy: "System",
      },
    });

    console.log(`Seeded email template: "${created.title}" (${created.id})`);
  }
}

async function main() {
  await seedAdminUser();
  await seedEmailTemplates();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
