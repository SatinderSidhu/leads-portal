import type { WaitUnit, StepCondition, ContactAction } from "@prisma/client";

export function calculateNextSendAt(
  waitValue: number,
  waitUnit: WaitUnit,
  fromDate: Date = new Date()
): Date {
  const result = new Date(fromDate);
  switch (waitUnit) {
    case "HOURS":
      result.setHours(result.getHours() + waitValue);
      break;
    case "DAYS":
      result.setDate(result.getDate() + waitValue);
      break;
    case "WEEKS":
      result.setDate(result.getDate() + waitValue * 7);
      break;
  }
  return result;
}

export function checkStepCondition(
  condition: StepCondition,
  lastAction: ContactAction
): boolean {
  switch (condition) {
    case "ALWAYS":
      return true;
    case "OPENED":
      return lastAction === "OPENED" || lastAction === "CLICKED";
    case "NOT_OPENED":
      return lastAction === "NONE";
    case "CLICKED":
      return lastAction === "CLICKED";
    case "NOT_CLICKED":
      return lastAction !== "CLICKED";
    case "REPLIED":
      return lastAction === "REPLIED";
    case "NOT_REPLIED":
      return lastAction !== "REPLIED";
    default:
      return true;
  }
}

export function formatWaitDescription(waitValue: number, waitUnit: WaitUnit): string {
  const unitLabels: Record<WaitUnit, [string, string]> = {
    HOURS: ["hour", "hours"],
    DAYS: ["day", "days"],
    WEEKS: ["week", "weeks"],
  };
  const [singular, plural] = unitLabels[waitUnit];
  return `${waitValue} ${waitValue === 1 ? singular : plural}`;
}

export function formatConditionLabel(condition: StepCondition): string {
  const labels: Record<StepCondition, string> = {
    ALWAYS: "Always proceed",
    OPENED: "If opened",
    NOT_OPENED: "If not opened",
    CLICKED: "If clicked a link",
    NOT_CLICKED: "If no link clicked",
    REPLIED: "If replied",
    NOT_REPLIED: "If no reply",
  };
  return labels[condition] || condition;
}

export const GOAL_LABELS: Record<string, string> = {
  BOOK_MEETING: "Book a Meeting",
  GET_REPLY: "Get a Reply",
  DRIVE_PURCHASE: "Drive a Purchase",
  NURTURE_ONLY: "Nurture Only",
};

export const TRIGGER_LABELS: Record<string, string> = {
  MANUAL: "Manual",
  STAGE_CHANGE: "Stage Changes",
  LEAD_CREATED: "New Lead Created",
};

export const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  ACTIVE: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  PAUSED: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
};

export const ENROLLMENT_STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  PAUSED: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  COMPLETED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  EXITED: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  REMOVED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

export const ACTION_LABELS: Record<string, string> = {
  NONE: "No action",
  OPENED: "Opened",
  CLICKED: "Clicked",
  REPLIED: "Replied",
};

export const EXIT_CONDITION_OPTIONS = [
  { value: "REPLIED", label: "Contact replied to any email" },
  { value: "MEETING_BOOKED", label: "Contact booked a meeting" },
  { value: "UNSUBSCRIBED", label: "Contact unsubscribed / Do Not Contact" },
  { value: "MANUAL_REMOVE", label: "Manually removed by team member" },
];
