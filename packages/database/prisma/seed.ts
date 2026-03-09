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
  {
    title: "Gentle Reminder — Still Interested?",
    subject: "Quick Check-In on {{projectName}} — KitLabs",
    body: `<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
  <div style="text-align: center; padding: 28px 20px; background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); border-radius: 8px 8px 0 0;">
    <img src="https://www.kitlabs.us/wp-content/uploads/2025/02/FINAL-LOGO-KITLABS-USA.png" alt="KitLabs Inc." style="height: 48px; margin-bottom: 8px;" />
    <p style="color: #bfdbfe; margin: 0; font-size: 13px; letter-spacing: 0.5px;">Technology Solutions That Drive Results</p>
  </div>

  <div style="padding: 32px 28px; background: #ffffff; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
    <p style="font-size: 16px; line-height: 1.6; margin-top: 0;">Hi <strong>{{customerName}}</strong>,</p>

    <p style="font-size: 15px; line-height: 1.7;">I hope this message finds you well. I wanted to follow up on our conversation about <strong>{{projectName}}</strong> — we haven't heard back and wanted to make sure your inquiry didn't slip through the cracks.</p>

    <div style="background: #f0f7ff; border-left: 4px solid #2563eb; padding: 20px 24px; border-radius: 0 8px 8px 0; margin: 24px 0;">
      <p style="margin: 0 0 12px; font-size: 14px; color: #1e3a5f; font-weight: 600;">We understand things get busy. Here's a quick recap:</p>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 6px 0; font-size: 14px; color: #555; width: 24px; vertical-align: top;">&#10003;</td>
          <td style="padding: 6px 0; font-size: 14px; color: #555;">We reviewed your project requirements</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-size: 14px; color: #555; vertical-align: top;">&#10003;</td>
          <td style="padding: 6px 0; font-size: 14px; color: #555;">Our team is ready to begin the discovery phase</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-size: 14px; color: #555; vertical-align: top;">&#10003;</td>
          <td style="padding: 6px 0; font-size: 14px; color: #555;">A free consultation is still available for you</td>
        </tr>
      </table>
    </div>

    <p style="font-size: 15px; line-height: 1.7;">If you're still interested, I'd love to pick up where we left off. If your priorities have changed, no worries at all — just let us know and we'll be here whenever you're ready.</p>

    <div style="text-align: center; margin: 28px 0;">
      <a href="https://www.kitlabs.us/book-us/" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 6px; font-size: 15px; font-weight: 600; letter-spacing: 0.3px;">Let's Reconnect</a>
    </div>

    <p style="font-size: 14px; color: #888; text-align: center; margin-bottom: 0;">Or simply reply to this email — we're always just a message away.</p>
  </div>

  <div style="padding: 24px 28px; background: #f9fafb; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="margin: 0; font-size: 14px; color: #555; font-weight: 600;">Best regards,</p>
    <p style="margin: 4px 0 0; font-size: 14px; color: #333; font-weight: 700;">The KitLabs Team</p>
    <p style="margin: 2px 0 0; font-size: 13px; color: #888;">
      <a href="https://www.kitlabs.us" style="color: #2563eb; text-decoration: none;">www.kitlabs.us</a>
    </p>
  </div>
</div>`,
    purpose: "REMINDER",
    tags: ["reminder", "follow-up", "check-in", "gentle"],
    notes: "Gentle reminder for leads who haven't responded. Non-pushy tone with a recap of where things stand and easy CTA to reconnect.",
  },
  {
    title: "Limited Time — New Project Special Offer",
    subject: "Exclusive Offer for Your Next Project — KitLabs",
    body: `<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
  <div style="text-align: center; padding: 28px 20px; background: linear-gradient(135deg, #7c3aed 0%, #2563eb 100%); border-radius: 8px 8px 0 0;">
    <img src="https://www.kitlabs.us/wp-content/uploads/2025/02/FINAL-LOGO-KITLABS-USA.png" alt="KitLabs Inc." style="height: 48px; margin-bottom: 8px;" />
    <p style="color: #c4b5fd; margin: 0; font-size: 13px; letter-spacing: 0.5px;">Technology Solutions That Drive Results</p>
  </div>

  <div style="padding: 32px 28px; background: #ffffff; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
    <p style="font-size: 16px; line-height: 1.6; margin-top: 0;">Hi <strong>{{customerName}}</strong>,</p>

    <p style="font-size: 15px; line-height: 1.7;">We're running a <strong>limited-time offer</strong> for new projects, and we'd love for you to take advantage of it for <strong>{{projectName}}</strong>.</p>

    <!-- Offer Card -->
    <div style="background: linear-gradient(135deg, #f5f3ff 0%, #eff6ff 100%); border: 2px solid #c4b5fd; border-radius: 12px; padding: 28px; margin: 24px 0; text-align: center;">
      <p style="font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px; color: #7c3aed; font-weight: 700; margin: 0 0 8px;">Exclusive Offer</p>
      <p style="font-size: 36px; font-weight: 800; color: #1e3a5f; margin: 0; line-height: 1;">15% OFF</p>
      <p style="font-size: 15px; color: #555; margin: 8px 0 0;">on your first project with KitLabs</p>
      <hr style="border: none; border-top: 1px dashed #c4b5fd; margin: 20px 40px;" />
      <p style="font-size: 13px; color: #7c3aed; font-weight: 600; margin: 0;">Valid for projects starting within the next 30 days</p>
    </div>

    <p style="font-size: 15px; line-height: 1.7;">Here's what's included regardless of your project size:</p>

    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr>
        <td style="padding: 10px 14px; background: #f9fafb; border-radius: 6px; font-size: 14px; color: #333;">
          <strong style="color: #7c3aed;">&#9670;</strong>&nbsp;&nbsp;Free discovery & strategy session
        </td>
      </tr>
      <tr><td style="height: 8px;"></td></tr>
      <tr>
        <td style="padding: 10px 14px; background: #f9fafb; border-radius: 6px; font-size: 14px; color: #333;">
          <strong style="color: #7c3aed;">&#9670;</strong>&nbsp;&nbsp;Dedicated project manager
        </td>
      </tr>
      <tr><td style="height: 8px;"></td></tr>
      <tr>
        <td style="padding: 10px 14px; background: #f9fafb; border-radius: 6px; font-size: 14px; color: #333;">
          <strong style="color: #7c3aed;">&#9670;</strong>&nbsp;&nbsp;30 days post-launch support
        </td>
      </tr>
      <tr><td style="height: 8px;"></td></tr>
      <tr>
        <td style="padding: 10px 14px; background: #f9fafb; border-radius: 6px; font-size: 14px; color: #333;">
          <strong style="color: #7c3aed;">&#9670;</strong>&nbsp;&nbsp;Responsive design across all devices
        </td>
      </tr>
    </table>

    <div style="text-align: center; margin: 28px 0;">
      <a href="https://www.kitlabs.us/book-us/" style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #2563eb 100%); color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 6px; font-size: 15px; font-weight: 600; letter-spacing: 0.3px;">Claim Your Offer</a>
    </div>

    <p style="font-size: 13px; color: #888; text-align: center; margin-bottom: 0;">This offer is exclusive and time-limited. Don't miss out!</p>
  </div>

  <div style="padding: 24px 28px; background: #f9fafb; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="margin: 0; font-size: 14px; color: #555; font-weight: 600;">Cheers,</p>
    <p style="margin: 4px 0 0; font-size: 14px; color: #333; font-weight: 700;">The KitLabs Team</p>
    <p style="margin: 2px 0 0; font-size: 13px; color: #888;">
      <a href="https://www.kitlabs.us" style="color: #2563eb; text-decoration: none;">www.kitlabs.us</a>
    </p>
  </div>
</div>`,
    purpose: "PROMOTIONAL",
    tags: ["promotional", "offer", "discount", "limited-time"],
    notes: "Promotional template with 15% discount offer for new projects. Features a prominent offer card with gradient background and urgency messaging. Edit discount percentage and validity as needed.",
  },
  {
    title: "Project Kickoff — Let's Get Started!",
    subject: "Welcome Aboard! Kicking Off {{projectName}} — KitLabs",
    body: `<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
  <div style="text-align: center; padding: 28px 20px; background: linear-gradient(135deg, #059669 0%, #10b981 100%); border-radius: 8px 8px 0 0;">
    <img src="https://www.kitlabs.us/wp-content/uploads/2025/02/FINAL-LOGO-KITLABS-USA.png" alt="KitLabs Inc." style="height: 48px; margin-bottom: 8px;" />
    <p style="color: #a7f3d0; margin: 0; font-size: 13px; letter-spacing: 0.5px;">Technology Solutions That Drive Results</p>
  </div>

  <div style="padding: 32px 28px; background: #ffffff; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; background: #ecfdf5; border-radius: 50%; width: 60px; height: 60px; line-height: 60px; font-size: 28px;">&#127881;</div>
      <h2 style="margin: 12px 0 0; color: #1e3a5f; font-size: 22px;">Project Kickoff!</h2>
    </div>

    <p style="font-size: 16px; line-height: 1.6; margin-top: 0;">Hi <strong>{{customerName}}</strong>,</p>

    <p style="font-size: 15px; line-height: 1.7;">We're thrilled to officially kick off <strong>{{projectName}}</strong>! Our team is excited to start building something great together.</p>

    <p style="font-size: 15px; line-height: 1.7; font-weight: 600; color: #1e3a5f;">Here's what happens next:</p>

    <!-- Timeline -->
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <tr>
        <td style="width: 44px; vertical-align: top; padding: 0 12px 24px 0; text-align: center;">
          <div style="width: 32px; height: 32px; background: #059669; color: white; border-radius: 50%; line-height: 32px; text-align: center; font-weight: 700; font-size: 14px;">1</div>
          <div style="width: 2px; height: 24px; background: #d1fae5; margin: 4px auto 0;"></div>
        </td>
        <td style="padding: 4px 0 24px; vertical-align: top;">
          <strong style="font-size: 14px; color: #1e3a5f;">Discovery & Planning</strong>
          <p style="margin: 4px 0 0; font-size: 13px; color: #6b7280; line-height: 1.5;">We'll schedule a detailed session to define project scope, goals, timeline, and milestones.</p>
        </td>
      </tr>
      <tr>
        <td style="width: 44px; vertical-align: top; padding: 0 12px 24px 0; text-align: center;">
          <div style="width: 32px; height: 32px; background: #059669; color: white; border-radius: 50%; line-height: 32px; text-align: center; font-weight: 700; font-size: 14px;">2</div>
          <div style="width: 2px; height: 24px; background: #d1fae5; margin: 4px auto 0;"></div>
        </td>
        <td style="padding: 4px 0 24px; vertical-align: top;">
          <strong style="font-size: 14px; color: #1e3a5f;">Design Phase</strong>
          <p style="margin: 4px 0 0; font-size: 13px; color: #6b7280; line-height: 1.5;">Our design team will create wireframes and mockups for your review and approval.</p>
        </td>
      </tr>
      <tr>
        <td style="width: 44px; vertical-align: top; padding: 0 12px 24px 0; text-align: center;">
          <div style="width: 32px; height: 32px; background: #059669; color: white; border-radius: 50%; line-height: 32px; text-align: center; font-weight: 700; font-size: 14px;">3</div>
          <div style="width: 2px; height: 24px; background: #d1fae5; margin: 4px auto 0;"></div>
        </td>
        <td style="padding: 4px 0 24px; vertical-align: top;">
          <strong style="font-size: 14px; color: #1e3a5f;">Development & Build</strong>
          <p style="margin: 4px 0 0; font-size: 13px; color: #6b7280; line-height: 1.5;">We build your project with regular progress updates and review checkpoints.</p>
        </td>
      </tr>
      <tr>
        <td style="width: 44px; vertical-align: top; padding: 0 12px 0 0; text-align: center;">
          <div style="width: 32px; height: 32px; background: #059669; color: white; border-radius: 50%; line-height: 32px; text-align: center; font-weight: 700; font-size: 14px;">4</div>
        </td>
        <td style="padding: 4px 0 0; vertical-align: top;">
          <strong style="font-size: 14px; color: #1e3a5f;">Launch & Support</strong>
          <p style="margin: 4px 0 0; font-size: 13px; color: #6b7280; line-height: 1.5;">Final review, go-live, and post-launch support to ensure everything runs smoothly.</p>
        </td>
      </tr>
    </table>

    <div style="background: #ecfdf5; border-radius: 8px; padding: 16px 20px; margin: 24px 0;">
      <p style="margin: 0; font-size: 14px; color: #065f46;"><strong>Your project portal is live!</strong> You can track progress, view status updates, and communicate with our team anytime.</p>
    </div>

    <div style="text-align: center; margin: 28px 0;">
      <a href="https://www.kitlabs.us/book-us/" style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 6px; font-size: 15px; font-weight: 600; letter-spacing: 0.3px;">Schedule Kickoff Meeting</a>
    </div>

    <p style="font-size: 15px; line-height: 1.7; margin-bottom: 0;">We're committed to making <strong>{{projectName}}</strong> a success. Let's build something amazing!</p>
  </div>

  <div style="padding: 24px 28px; background: #f9fafb; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="margin: 0; font-size: 14px; color: #555; font-weight: 600;">Excited to get started,</p>
    <p style="margin: 4px 0 0; font-size: 14px; color: #333; font-weight: 700;">The KitLabs Team</p>
    <p style="margin: 2px 0 0; font-size: 13px; color: #888;">
      <a href="https://www.kitlabs.us" style="color: #2563eb; text-decoration: none;">www.kitlabs.us</a>
    </p>
  </div>
</div>`,
    purpose: "NOTIFICATION",
    tags: ["kickoff", "onboarding", "project-start", "welcome"],
    notes: "Project kickoff email sent when a lead converts to an active project. Features a step-by-step timeline of the project process and links to the project portal.",
  },
  {
    title: "Client Success Stories — See the Results",
    subject: "Real Results From Real Clients — KitLabs",
    body: `<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
  <div style="text-align: center; padding: 28px 20px; background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); border-radius: 8px 8px 0 0;">
    <img src="https://www.kitlabs.us/wp-content/uploads/2025/02/FINAL-LOGO-KITLABS-USA.png" alt="KitLabs Inc." style="height: 48px; margin-bottom: 8px;" />
    <p style="color: #bfdbfe; margin: 0; font-size: 13px; letter-spacing: 0.5px;">Technology Solutions That Drive Results</p>
  </div>

  <div style="padding: 32px 28px; background: #ffffff; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
    <p style="font-size: 16px; line-height: 1.6; margin-top: 0;">Hi <strong>{{customerName}}</strong>,</p>

    <p style="font-size: 15px; line-height: 1.7;">When it comes to choosing a technology partner, results speak louder than words. Here's what our clients have to say about working with KitLabs:</p>

    <!-- Testimonial 1 -->
    <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 24px; margin: 24px 0;">
      <div style="display: flex; align-items: flex-start;">
        <div style="font-size: 32px; color: #2563eb; line-height: 1; margin-right: 8px; font-family: Georgia, serif;">&ldquo;</div>
        <div>
          <p style="font-size: 14px; line-height: 1.6; color: #444; margin: 0; font-style: italic;">KitLabs transformed our outdated system into a modern platform that our patients and staff love. The team was responsive, creative, and delivered ahead of schedule.</p>
          <div style="margin-top: 12px;">
            <p style="margin: 0; font-size: 13px; font-weight: 700; color: #1e3a5f;">Sarah M.</p>
            <p style="margin: 2px 0 0; font-size: 12px; color: #888;">Director of Operations, Healthcare Company</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Testimonial 2 -->
    <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 24px; margin: 24px 0;">
      <div style="display: flex; align-items: flex-start;">
        <div style="font-size: 32px; color: #2563eb; line-height: 1; margin-right: 8px; font-family: Georgia, serif;">&ldquo;</div>
        <div>
          <p style="font-size: 14px; line-height: 1.6; color: #444; margin: 0; font-style: italic;">We needed a logistics app that could handle real-time tracking for our fleet. KitLabs not only delivered but exceeded expectations. Our efficiency improved by 40%.</p>
          <div style="margin-top: 12px;">
            <p style="margin: 0; font-size: 13px; font-weight: 700; color: #1e3a5f;">James R.</p>
            <p style="margin: 2px 0 0; font-size: 12px; color: #888;">CEO, Transportation & Logistics Firm</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Testimonial 3 -->
    <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 24px; margin: 24px 0;">
      <div style="display: flex; align-items: flex-start;">
        <div style="font-size: 32px; color: #2563eb; line-height: 1; margin-right: 8px; font-family: Georgia, serif;">&ldquo;</div>
        <div>
          <p style="font-size: 14px; line-height: 1.6; color: #444; margin: 0; font-style: italic;">From concept to launch, KitLabs guided us every step of the way. Our e-commerce platform saw a 60% increase in conversions within the first month.</p>
          <div style="margin-top: 12px;">
            <p style="margin: 0; font-size: 13px; font-weight: 700; color: #1e3a5f;">Michelle T.</p>
            <p style="margin: 2px 0 0; font-size: 12px; color: #888;">Founder, E-Commerce Brand</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Stats Bar -->
    <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
      <tr>
        <td style="text-align: center; padding: 16px; background: #eff6ff; border-radius: 8px 0 0 8px; border-right: 2px solid #ffffff;">
          <p style="margin: 0; font-size: 28px; font-weight: 800; color: #2563eb;">50+</p>
          <p style="margin: 4px 0 0; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Projects Delivered</p>
        </td>
        <td style="text-align: center; padding: 16px; background: #eff6ff; border-right: 2px solid #ffffff;">
          <p style="margin: 0; font-size: 28px; font-weight: 800; color: #2563eb;">98%</p>
          <p style="margin: 4px 0 0; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Client Satisfaction</p>
        </td>
        <td style="text-align: center; padding: 16px; background: #eff6ff; border-radius: 0 8px 8px 0;">
          <p style="margin: 0; font-size: 28px; font-weight: 800; color: #2563eb;">5&#9733;</p>
          <p style="margin: 4px 0 0; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Average Rating</p>
        </td>
      </tr>
    </table>

    <p style="font-size: 15px; line-height: 1.7;">We'd love to add <strong>{{projectName}}</strong> to our list of success stories. Let's discuss how we can deliver the same outstanding results for you.</p>

    <div style="text-align: center; margin: 28px 0;">
      <a href="https://www.kitlabs.us/book-us/" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 6px; font-size: 15px; font-weight: 600; letter-spacing: 0.3px;">Start Your Success Story</a>
    </div>
  </div>

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
    tags: ["testimonials", "case-study", "social-proof", "results"],
    notes: "Social proof email featuring 3 client testimonials and key stats (50+ projects, 98% satisfaction, 5-star rating). Great for warming up leads who are evaluating options.",
  },
  {
    title: "Season's Greetings & New Year Kickoff",
    subject: "Happy Holidays from KitLabs — Let's Make Next Year Amazing!",
    body: `<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
  <div style="text-align: center; padding: 36px 20px; background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 50%, #1e3a5f 100%); border-radius: 8px 8px 0 0; position: relative;">
    <div style="font-size: 40px; margin-bottom: 12px;">&#10052; &#127876; &#10052;</div>
    <img src="https://www.kitlabs.us/wp-content/uploads/2025/02/FINAL-LOGO-KITLABS-USA.png" alt="KitLabs Inc." style="height: 48px; margin-bottom: 10px;" />
    <h2 style="color: #fbbf24; margin: 0; font-size: 22px; font-weight: 700;">Season's Greetings!</h2>
    <p style="color: #93c5fd; margin: 6px 0 0; font-size: 14px;">Wishing you joy, success, and innovation</p>
  </div>

  <div style="padding: 32px 28px; background: #ffffff; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
    <p style="font-size: 16px; line-height: 1.6; margin-top: 0;">Hi <strong>{{customerName}}</strong>,</p>

    <p style="font-size: 15px; line-height: 1.7;">As the year comes to a close, we wanted to take a moment to thank you for your interest in KitLabs. Whether we've worked together or are just getting started, we truly appreciate you.</p>

    <div style="background: linear-gradient(135deg, #fefce8 0%, #fff7ed 100%); border: 1px solid #fde68a; border-radius: 10px; padding: 24px; margin: 24px 0; text-align: center;">
      <p style="font-size: 18px; font-weight: 700; color: #92400e; margin: 0 0 8px;">New Year, New Projects!</p>
      <p style="font-size: 14px; color: #78350f; line-height: 1.6; margin: 0;">Start the new year strong with a technology partner who delivers. We're offering <strong>free strategy sessions</strong> in January to help you plan your digital roadmap for the year ahead.</p>
    </div>

    <p style="font-size: 15px; line-height: 1.7;">Here are some ways we can help you hit the ground running:</p>

    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr>
        <td style="padding: 10px 14px; background: #f0fdf4; border-radius: 6px; font-size: 14px; color: #333;">
          <strong style="color: #059669;">&#9733;</strong>&nbsp;&nbsp;Launch a new website or web application
        </td>
      </tr>
      <tr><td style="height: 8px;"></td></tr>
      <tr>
        <td style="padding: 10px 14px; background: #f0fdf4; border-radius: 6px; font-size: 14px; color: #333;">
          <strong style="color: #059669;">&#9733;</strong>&nbsp;&nbsp;Build a mobile app for your business
        </td>
      </tr>
      <tr><td style="height: 8px;"></td></tr>
      <tr>
        <td style="padding: 10px 14px; background: #f0fdf4; border-radius: 6px; font-size: 14px; color: #333;">
          <strong style="color: #059669;">&#9733;</strong>&nbsp;&nbsp;Automate workflows with AI & smart tools
        </td>
      </tr>
      <tr><td style="height: 8px;"></td></tr>
      <tr>
        <td style="padding: 10px 14px; background: #f0fdf4; border-radius: 6px; font-size: 14px; color: #333;">
          <strong style="color: #059669;">&#9733;</strong>&nbsp;&nbsp;Revamp your brand's digital presence
        </td>
      </tr>
    </table>

    <div style="text-align: center; margin: 28px 0;">
      <a href="https://www.kitlabs.us/book-us/" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 6px; font-size: 15px; font-weight: 600; letter-spacing: 0.3px;">Book Your Free Strategy Session</a>
    </div>

    <p style="font-size: 15px; line-height: 1.7; text-align: center; margin-bottom: 0;">From everyone at KitLabs — happy holidays and here's to an incredible year ahead!</p>
  </div>

  <div style="padding: 24px 28px; background: #f9fafb; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="margin: 0; font-size: 14px; color: #555; font-weight: 600;">Warm wishes,</p>
    <p style="margin: 4px 0 0; font-size: 14px; color: #333; font-weight: 700;">The KitLabs Team</p>
    <p style="margin: 2px 0 0; font-size: 13px; color: #888;">
      <a href="https://www.kitlabs.us" style="color: #2563eb; text-decoration: none;">www.kitlabs.us</a>
    </p>
  </div>
</div>`,
    purpose: "PROMOTIONAL",
    tags: ["seasonal", "holiday", "new-year", "greetings", "strategy"],
    notes: "Seasonal holiday/new year email combining warm greetings with a CTA for free January strategy sessions. Edit the season/holiday messaging and offers to match the current time of year.",
  },
  {
    title: "AI & Automation — Transform Your Business",
    subject: "How AI Can Supercharge Your Business — KitLabs",
    body: `<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
  <div style="text-align: center; padding: 28px 20px; background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #7c3aed 100%); border-radius: 8px 8px 0 0;">
    <img src="https://www.kitlabs.us/wp-content/uploads/2025/02/FINAL-LOGO-KITLABS-USA.png" alt="KitLabs Inc." style="height: 48px; margin-bottom: 8px;" />
    <p style="color: #c4b5fd; margin: 0; font-size: 13px; letter-spacing: 0.5px;">AI-Powered Solutions for Modern Business</p>
  </div>

  <div style="padding: 32px 28px; background: #ffffff; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
    <p style="font-size: 16px; line-height: 1.6; margin-top: 0;">Hi <strong>{{customerName}}</strong>,</p>

    <p style="font-size: 15px; line-height: 1.7;">Artificial Intelligence isn't just for tech giants anymore. Businesses of every size are using AI to work smarter, reduce costs, and deliver better customer experiences.</p>

    <p style="font-size: 15px; line-height: 1.7;">At <strong>KitLabs</strong>, we help companies integrate AI and automation into their existing workflows. Here's how we can transform <strong>{{projectName}}</strong>:</p>

    <!-- AI Services Grid -->
    <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
      <tr>
        <td style="padding: 20px; background: linear-gradient(135deg, #f5f3ff, #eff6ff); border-radius: 10px; vertical-align: top; width: 50%;">
          <div style="font-size: 28px; margin-bottom: 8px;">&#129302;</div>
          <strong style="font-size: 14px; color: #1e3a5f; display: block; margin-bottom: 6px;">AI Chatbots</strong>
          <p style="margin: 0; font-size: 12px; color: #6b7280; line-height: 1.5;">24/7 customer support, lead qualification, and automated responses that feel human.</p>
        </td>
        <td style="width: 12px;"></td>
        <td style="padding: 20px; background: linear-gradient(135deg, #f5f3ff, #eff6ff); border-radius: 10px; vertical-align: top; width: 50%;">
          <div style="font-size: 28px; margin-bottom: 8px;">&#9889;</div>
          <strong style="font-size: 14px; color: #1e3a5f; display: block; margin-bottom: 6px;">Process Automation</strong>
          <p style="margin: 0; font-size: 12px; color: #6b7280; line-height: 1.5;">Eliminate repetitive tasks, automate workflows, and free up your team for high-value work.</p>
        </td>
      </tr>
      <tr><td colspan="3" style="height: 12px;"></td></tr>
      <tr>
        <td style="padding: 20px; background: linear-gradient(135deg, #f5f3ff, #eff6ff); border-radius: 10px; vertical-align: top;">
          <div style="font-size: 28px; margin-bottom: 8px;">&#128202;</div>
          <strong style="font-size: 14px; color: #1e3a5f; display: block; margin-bottom: 6px;">Smart Analytics</strong>
          <p style="margin: 0; font-size: 12px; color: #6b7280; line-height: 1.5;">Turn raw data into actionable insights with AI-powered dashboards and predictions.</p>
        </td>
        <td style="width: 12px;"></td>
        <td style="padding: 20px; background: linear-gradient(135deg, #f5f3ff, #eff6ff); border-radius: 10px; vertical-align: top;">
          <div style="font-size: 28px; margin-bottom: 8px;">&#128640;</div>
          <strong style="font-size: 14px; color: #1e3a5f; display: block; margin-bottom: 6px;">Custom AI Solutions</strong>
          <p style="margin: 0; font-size: 12px; color: #6b7280; line-height: 1.5;">Tailored AI models for your specific industry — from document processing to recommendation engines.</p>
        </td>
      </tr>
    </table>

    <!-- Impact Stats -->
    <div style="background: #0f172a; border-radius: 10px; padding: 24px; margin: 24px 0; text-align: center;">
      <p style="color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 12px;">Average Impact for Our Clients</p>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="text-align: center; padding: 8px;">
            <p style="margin: 0; font-size: 24px; font-weight: 800; color: #7c3aed;">60%</p>
            <p style="margin: 2px 0 0; font-size: 11px; color: #94a3b8;">Less Manual Work</p>
          </td>
          <td style="text-align: center; padding: 8px;">
            <p style="margin: 0; font-size: 24px; font-weight: 800; color: #2563eb;">3x</p>
            <p style="margin: 2px 0 0; font-size: 11px; color: #94a3b8;">Faster Response Time</p>
          </td>
          <td style="text-align: center; padding: 8px;">
            <p style="margin: 0; font-size: 24px; font-weight: 800; color: #10b981;">40%</p>
            <p style="margin: 2px 0 0; font-size: 11px; color: #94a3b8;">Cost Reduction</p>
          </td>
        </tr>
      </table>
    </div>

    <p style="font-size: 15px; line-height: 1.7;">Ready to explore what AI can do for your business? Let's start with a <strong>free AI readiness assessment</strong> — we'll evaluate your current processes and identify the highest-impact opportunities.</p>

    <div style="text-align: center; margin: 28px 0;">
      <a href="https://www.kitlabs.us/book-us/" style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #2563eb 100%); color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 6px; font-size: 15px; font-weight: 600; letter-spacing: 0.3px;">Get Your Free AI Assessment</a>
    </div>
  </div>

  <div style="padding: 24px 28px; background: #f9fafb; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="margin: 0; font-size: 14px; color: #555; font-weight: 600;">To the future,</p>
    <p style="margin: 4px 0 0; font-size: 14px; color: #333; font-weight: 700;">The KitLabs AI Team</p>
    <p style="margin: 2px 0 0; font-size: 13px; color: #888;">
      <a href="https://www.kitlabs.us" style="color: #2563eb; text-decoration: none;">www.kitlabs.us</a>
    </p>
  </div>
</div>`,
    purpose: "PROMOTIONAL",
    tags: ["ai", "automation", "service-specific", "technology", "chatbot"],
    notes: "Service-specific email focused on AI & Automation services. Features a 4-card services grid, dark impact stats banner, and CTA for a free AI readiness assessment. Great for tech-savvy leads.",
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
