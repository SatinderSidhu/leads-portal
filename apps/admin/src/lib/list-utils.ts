import type { Prisma } from "@prisma/client";

export interface FilterRule {
  field: string;
  operator: string;
  value: string | string[] | number | boolean;
  logic?: "AND" | "OR";
}

/**
 * Converts an array of FilterRule objects into a Prisma `where` clause for Lead queries.
 * Supports AND/OR logic between conditions.
 */
export function buildPrismaWhereFromFilters(filters: FilterRule[]): Prisma.LeadWhereInput {
  if (!filters || filters.length === 0) return {};

  const conditions: Prisma.LeadWhereInput[] = [];

  for (const filter of filters) {
    const condition = buildSingleCondition(filter);
    if (condition) conditions.push(condition);
  }

  if (conditions.length === 0) return {};

  // Check if any filter uses OR logic
  const hasOr = filters.some((f) => f.logic === "OR");
  if (hasOr) {
    // Group: AND conditions together, OR conditions together
    const andConditions: Prisma.LeadWhereInput[] = [];
    const orConditions: Prisma.LeadWhereInput[] = [];

    filters.forEach((f, i) => {
      const cond = buildSingleCondition(f);
      if (!cond) return;
      if (f.logic === "OR") orConditions.push(cond);
      else andConditions.push(cond);
    });

    const parts: Prisma.LeadWhereInput[] = [];
    if (andConditions.length > 0) parts.push({ AND: andConditions });
    if (orConditions.length > 0) parts.push({ OR: orConditions });

    return parts.length === 1 ? parts[0] : { AND: parts };
  }

  return { AND: conditions };
}

function buildSingleCondition(filter: FilterRule): Prisma.LeadWhereInput | null {
  const { field, operator, value } = filter;

  // Map filter field names to Lead model fields
  const fieldMap: Record<string, string> = {
    industry: "industry",
    jobTitle: "jobTitle",
    companyName: "companyName",
    companySize: "companySize",
    stage: "stage",
    source: "source",
    assignedTo: "assignedToId",
    location: "location",
    city: "city",
    naicsSectorCode: "naicsSectorCode",
    naicsSubsectorCode: "naicsSubsectorCode",
    doNotContact: "doNotContact",
    leadScore: "leadScore",
  };

  const prismaField = fieldMap[field] || field;

  // Boolean fields
  if (field === "doNotContact") {
    const boolVal = value === true || value === "true";
    if (operator === "is") return { [prismaField]: boolVal };
    if (operator === "is_not") return { [prismaField]: !boolVal };
    return null;
  }

  // Date fields
  if (field === "createdAt" || field === "lastContactedDate" || field === "dateCreated") {
    const dateField = field === "dateCreated" ? "dateCreated" : field === "lastContactedDate" ? "lastContactedDate" : "createdAt";
    if (operator === "is_before") return { [dateField]: { lt: new Date(value as string) } };
    if (operator === "is_after") return { [dateField]: { gt: new Date(value as string) } };
    if (operator === "is_within_last") {
      const days = parseInt(value as string, 10);
      const since = new Date();
      since.setDate(since.getDate() - days);
      return { [dateField]: { gte: since } };
    }
    return null;
  }

  // Numeric fields
  if (field === "leadScore") {
    const numVal = parseInt(value as string, 10);
    if (operator === "is") return { [prismaField]: numVal };
    if (operator === "gt") return { [prismaField]: { gt: numVal } };
    if (operator === "lt") return { [prismaField]: { lt: numVal } };
    if (operator === "gte") return { [prismaField]: { gte: numVal } };
    if (operator === "lte") return { [prismaField]: { lte: numVal } };
    return null;
  }

  // String / Enum fields
  switch (operator) {
    case "is":
      return { [prismaField]: value as string };
    case "is_not":
      return { [prismaField]: { not: value as string } };
    case "contains":
      return { [prismaField]: { contains: value as string, mode: "insensitive" } };
    case "is_one_of":
      return { [prismaField]: { in: Array.isArray(value) ? value : (value as string).split(",").map((v) => v.trim()) } };
    case "is_not_one_of":
      return { [prismaField]: { notIn: Array.isArray(value) ? value : (value as string).split(",").map((v) => v.trim()) } };
    default:
      return null;
  }
}

export const LIST_TYPE_COLORS: Record<string, string> = {
  STATIC: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  DYNAMIC: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
};

export const FILTER_FIELD_OPTIONS = [
  { value: "industry", label: "Industry", type: "text" },
  { value: "jobTitle", label: "Job Title", type: "text" },
  { value: "companyName", label: "Company Name", type: "text" },
  { value: "companySize", label: "Company Size", type: "select", options: ["1-10", "11-50", "51-200", "201-500", "501-1000", "1001-5000", "5001-10000", "10000+"] },
  { value: "stage", label: "Lead Stage", type: "select", options: ["COLD", "WARM", "HOT", "ACTIVE", "CLOSED", "NEW", "CONTACTED", "RESPONDED", "MEETING_BOOKED", "QUALIFIED", "DISQUALIFIED", "NURTURE"] },
  { value: "source", label: "Lead Source", type: "select", options: ["MANUAL", "AGENT", "BARK", "LINKEDIN_SALES_NAV", "APOLLO", "LINKEDIN_COMPANY_PAGE", "REFERRAL", "WEBSITE", "COLD_OUTREACH", "EVENT", "SMB_APP_CONTEST_2026", "SMB_NY_2026", "OTHER"] },
  { value: "location", label: "Location", type: "text" },
  { value: "city", label: "City", type: "text" },
  { value: "naicsSectorCode", label: "NAICS Sector", type: "text" },
  { value: "doNotContact", label: "Do Not Contact", type: "boolean" },
  { value: "leadScore", label: "Lead Score", type: "number" },
  { value: "createdAt", label: "Date Added", type: "date" },
  { value: "lastContactedDate", label: "Last Contacted", type: "date" },
];

export const OPERATOR_OPTIONS: Record<string, { value: string; label: string }[]> = {
  text: [
    { value: "is", label: "is" },
    { value: "is_not", label: "is not" },
    { value: "contains", label: "contains" },
  ],
  select: [
    { value: "is", label: "is" },
    { value: "is_not", label: "is not" },
    { value: "is_one_of", label: "is one of" },
  ],
  boolean: [
    { value: "is", label: "is" },
    { value: "is_not", label: "is not" },
  ],
  number: [
    { value: "is", label: "equals" },
    { value: "gte", label: ">=" },
    { value: "lte", label: "<=" },
    { value: "gt", label: ">" },
    { value: "lt", label: "<" },
  ],
  date: [
    { value: "is_before", label: "is before" },
    { value: "is_after", label: "is after" },
    { value: "is_within_last", label: "is within last X days" },
  ],
};
