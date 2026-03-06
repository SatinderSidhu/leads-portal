import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface NdaSignedParams {
  customerName: string;
  customerEmail: string;
  projectName: string;
  signerName: string;
  signedAt: Date;
  signerIp: string;
  portalUrl: string;
}

export async function sendNdaSignedEmail(params: NdaSignedParams) {
  const {
    customerName,
    customerEmail,
    projectName,
    signerName,
    signedAt,
    signerIp,
    portalUrl,
  } = params;

  const formattedDate = signedAt.toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const fromEmail = process.env.SMTP_FROM || "noreply@leadsportal.com";

  console.log(`[Email] Sending NDA signed confirmations for "${projectName}"...`);
  const start = Date.now();

  // Email to customer
  await transporter.sendMail({
    from: fromEmail,
    to: customerEmail,
    subject: `NDA Signed Successfully — ${projectName}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); border-radius: 12px; padding: 40px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 24px;">NDA Signed Successfully</h1>
          <p style="color: rgba(255,255,255,0.9); margin-top: 8px; font-size: 16px;">${projectName}</p>
        </div>

        <div style="background: #f8f9fa; border-radius: 12px; padding: 30px; margin-bottom: 30px;">
          <p style="color: #333; font-size: 16px; line-height: 1.6; margin-top: 0;">
            Hi ${customerName},
          </p>
          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            This confirms that the Non-Disclosure Agreement for <strong>${projectName}</strong> has been successfully signed.
          </p>

          <div style="background: white; border-radius: 8px; padding: 16px; margin: 20px 0; border: 1px solid #e5e7eb;">
            <p style="color: #666; font-size: 14px; margin: 4px 0;"><strong>Signed By:</strong> ${signerName}</p>
            <p style="color: #666; font-size: 14px; margin: 4px 0;"><strong>Date:</strong> ${formattedDate}</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${portalUrl}"
               style="display: inline-block; background: #333; color: white; padding: 14px 32px;
                      border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600;">
              View Your Project
            </a>
          </div>
        </div>

        <p style="color: #999; font-size: 13px; text-align: center;">
          If you have any questions, simply reply to this email.
        </p>
      </div>
    `,
  });

  // Email to admin
  await transporter.sendMail({
    from: fromEmail,
    to: fromEmail,
    subject: `NDA Signed by ${customerName} — ${projectName}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); border-radius: 12px; padding: 40px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 24px;">NDA Signed</h1>
          <p style="color: rgba(255,255,255,0.9); margin-top: 8px; font-size: 16px;">${projectName}</p>
        </div>

        <div style="background: #f8f9fa; border-radius: 12px; padding: 30px; margin-bottom: 30px;">
          <p style="color: #333; font-size: 16px; line-height: 1.6; margin-top: 0;">
            The NDA for <strong>${projectName}</strong> has been signed by the customer.
          </p>

          <div style="background: white; border-radius: 8px; padding: 16px; margin: 20px 0; border: 1px solid #e5e7eb;">
            <p style="color: #666; font-size: 14px; margin: 4px 0;"><strong>Customer:</strong> ${customerName}</p>
            <p style="color: #666; font-size: 14px; margin: 4px 0;"><strong>Email:</strong> ${customerEmail}</p>
            <p style="color: #666; font-size: 14px; margin: 4px 0;"><strong>Signed By:</strong> ${signerName}</p>
            <p style="color: #666; font-size: 14px; margin: 4px 0;"><strong>Date:</strong> ${formattedDate}</p>
            <p style="color: #666; font-size: 14px; margin: 4px 0;"><strong>IP Address:</strong> ${signerIp}</p>
          </div>
        </div>
      </div>
    `,
  });

  console.log(`[Email] NDA signed emails sent in ${Date.now() - start}ms`);
}
