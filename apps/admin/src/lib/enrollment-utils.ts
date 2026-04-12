import { prisma } from "@leads-portal/database";
import type { EnrollmentTrigger } from "@prisma/client";
import { calculateNextSendAt } from "./sequence-utils";

/**
 * Enroll a lead in a sequence, checking suppression, DNC, and existing enrollment.
 * Returns true if enrolled, false if skipped (and why is logged).
 *
 * Used by:
 * - Manual list-trigger enrollment (when contacts are added to a list)
 * - LEAD_CREATED auto-trigger
 * - STAGE_CHANGE auto-trigger
 * - Bulk list enrollment
 * - Manual enrollment from the sequence detail page
 */
export async function autoEnrollLeadInSequence(
  sequenceId: string,
  leadId: string
): Promise<{ enrolled: boolean; reason?: string }> {
  try {
    // 1. Suppression list check — global block
    const suppressed = await prisma.listMembership.findFirst({
      where: { leadId, list: { isSuppression: true } },
      select: { id: true },
    });
    if (suppressed) return { enrolled: false, reason: "on suppression list" };

    // 2. DNC check
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { doNotContact: true },
    });
    if (!lead) return { enrolled: false, reason: "lead not found" };
    if (lead.doNotContact) return { enrolled: false, reason: "do not contact" };

    // 3. Existing enrollment check (unique on sequenceId+leadId)
    const existing = await prisma.sequenceEnrollment.findFirst({
      where: { sequenceId, leadId },
      select: { id: true },
    });
    if (existing) return { enrolled: false, reason: "already enrolled" };

    // 4. Load sequence + first step
    const sequence = await prisma.smartSequence.findUnique({
      where: { id: sequenceId },
      include: { steps: { orderBy: { stepOrder: "asc" }, take: 1 } },
    });
    if (!sequence) return { enrolled: false, reason: "sequence not found" };
    if (sequence.steps.length === 0) {
      return { enrolled: false, reason: "sequence has no steps" };
    }

    const firstStep = sequence.steps[0];
    const now = new Date();
    const nextSendAt =
      firstStep.waitValue === 0
        ? now
        : calculateNextSendAt(firstStep.waitValue, firstStep.waitUnit, now);

    // 5. Create the enrollment
    await prisma.sequenceEnrollment.create({
      data: {
        sequenceId,
        leadId,
        currentStepOrder: 1,
        status: "ACTIVE",
        nextSendAt,
      },
    });

    return { enrolled: true };
  } catch (error) {
    console.error(
      `[enrollment-utils] autoEnrollLeadInSequence failed for sequence ${sequenceId} lead ${leadId}:`,
      error
    );
    return { enrolled: false, reason: "error" };
  }
}

interface ProcessTriggerArgs {
  trigger: EnrollmentTrigger;
  leadId: string;
  /** For STAGE_CHANGE triggers */
  fromStage?: string;
  /** For STAGE_CHANGE triggers */
  toStage?: string;
  /** For ADDED_TO_LIST triggers */
  listId?: string;
  /** For LEAD_CREATED triggers — filter by lead source (e.g., APP_FACTORY) */
  leadSource?: string;
}

interface TriggerConfig {
  fromStage?: string;
  toStage?: string;
  source?: string;
}

/**
 * Find all active sequences matching a trigger event and enroll the lead in each.
 *
 * Best-effort: errors are logged but never thrown — the caller's request must
 * succeed (creating a lead, changing status) even if auto-enrollment fails.
 */
export async function processAutoEnrollmentTriggers(
  args: ProcessTriggerArgs
): Promise<{ enrolled: number; skipped: number }> {
  const { trigger, leadId, fromStage, toStage, listId, leadSource } = args;
  let enrolled = 0;
  let skipped = 0;

  try {
    // Build the query
    const where: {
      enrollmentTrigger: EnrollmentTrigger;
      status: "ACTIVE";
      triggerListId?: string;
    } = {
      enrollmentTrigger: trigger,
      status: "ACTIVE",
    };

    // ADDED_TO_LIST: filter by triggerListId
    if (trigger === "ADDED_TO_LIST" && listId) {
      where.triggerListId = listId;
    }

    const sequences = await prisma.smartSequence.findMany({
      where,
      select: { id: true, triggerConfig: true },
    });

    for (const seq of sequences) {
      const config = (seq.triggerConfig as TriggerConfig) || {};

      // LEAD_CREATED: filter by triggerConfig.source if specified
      if (trigger === "LEAD_CREATED" && config.source) {
        if (config.source !== leadSource) {
          skipped++;
          continue;
        }
      }

      // STAGE_CHANGE: filter by triggerConfig.fromStage / toStage
      if (trigger === "STAGE_CHANGE") {
        if (config.fromStage && config.fromStage !== fromStage) {
          skipped++;
          continue;
        }
        if (config.toStage && config.toStage !== toStage) {
          skipped++;
          continue;
        }
      }

      const result = await autoEnrollLeadInSequence(seq.id, leadId);
      if (result.enrolled) enrolled++;
      else skipped++;
    }
  } catch (error) {
    console.error(
      `[enrollment-utils] processAutoEnrollmentTriggers failed for trigger ${trigger} lead ${leadId}:`,
      error
    );
  }

  return { enrolled, skipped };
}
