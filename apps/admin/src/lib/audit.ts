import { prisma } from "@leads-portal/database";

/**
 * Log an action to the audit trail for a lead.
 * Non-blocking — callers should use .catch(() => {}).
 */
export async function logAudit(
  leadId: string,
  action: string,
  detail?: string | null,
  actor?: string | null
) {
  try {
    await prisma.auditLog.create({
      data: {
        leadId,
        action,
        detail: detail || null,
        actor: actor || null,
      },
    });
  } catch (error) {
    console.error("[Audit] Failed to log:", error);
  }
}
