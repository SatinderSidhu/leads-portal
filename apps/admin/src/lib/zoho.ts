import { prisma } from "@leads-portal/database";

// Data center base URLs
const ZOHO_API_URLS: Record<string, string> = {
  us: "https://www.zohoapis.com",
  eu: "https://www.zohoapis.eu",
  in: "https://www.zohoapis.in",
  au: "https://www.zohoapis.com.au",
  jp: "https://www.zohoapis.jp",
  ca: "https://www.zohoapis.ca",
};

const ZOHO_ACCOUNTS_URLS: Record<string, string> = {
  us: "https://accounts.zoho.com",
  eu: "https://accounts.zoho.eu",
  in: "https://accounts.zoho.in",
  au: "https://accounts.zoho.com.au",
  jp: "https://accounts.zoho.jp",
  ca: "https://accounts.zoho.ca",
};

const ZOHO_CRM_URLS: Record<string, string> = {
  us: "https://crm.zoho.com",
  eu: "https://crm.zoho.eu",
  in: "https://crm.zoho.in",
  au: "https://crm.zoho.com.au",
  jp: "https://crm.zoho.jp",
  ca: "https://crm.zoho.ca",
};

export interface ZohoConfig {
  id: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string | null;
  accessToken: string | null;
  tokenExpiry: Date | null;
  dataCenter: string;
  orgId: string | null;
  enabled: boolean;
}

export async function getZohoConfig(): Promise<ZohoConfig | null> {
  const config = await prisma.zohoConfig.findFirst();
  return config;
}

function getApiUrl(dataCenter: string): string {
  return ZOHO_API_URLS[dataCenter] || ZOHO_API_URLS.us;
}

function getAccountsUrl(dataCenter: string): string {
  return ZOHO_ACCOUNTS_URLS[dataCenter] || ZOHO_ACCOUNTS_URLS.us;
}

function getCrmUrl(dataCenter: string): string {
  return ZOHO_CRM_URLS[dataCenter] || ZOHO_CRM_URLS.us;
}

/**
 * Exchange a grant token for refresh + access tokens (one-time setup)
 */
export async function exchangeGrantToken(
  clientId: string,
  clientSecret: string,
  grantToken: string,
  dataCenter: string
): Promise<{ refreshToken: string; accessToken: string; expiresIn: number }> {
  const accountsUrl = getAccountsUrl(dataCenter);
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    code: grantToken,
  });

  const res = await fetch(`${accountsUrl}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const data = await res.json();
  if (data.error) {
    throw new Error(`Zoho OAuth error: ${data.error}`);
  }

  return {
    refreshToken: data.refresh_token,
    accessToken: data.access_token,
    expiresIn: data.expires_in || 3600,
  };
}

/**
 * Get a valid access token, refreshing if expired
 */
export async function getAccessToken(config: ZohoConfig): Promise<string> {
  // If token is still valid (with 5 min buffer), return it
  if (
    config.accessToken &&
    config.tokenExpiry &&
    config.tokenExpiry.getTime() > Date.now() + 5 * 60 * 1000
  ) {
    return config.accessToken;
  }

  if (!config.refreshToken) {
    throw new Error("No refresh token configured. Please authorize Zoho first.");
  }

  const accountsUrl = getAccountsUrl(config.dataCenter);
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: config.refreshToken,
  });

  const res = await fetch(`${accountsUrl}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const data = await res.json();
  if (data.error) {
    throw new Error(`Zoho token refresh failed: ${data.error}`);
  }

  const expiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000);

  // Save the new access token
  await prisma.zohoConfig.update({
    where: { id: config.id },
    data: {
      accessToken: data.access_token,
      tokenExpiry: expiresAt,
    },
  });

  return data.access_token;
}

/**
 * Fetch the Zoho org ID
 */
export async function fetchOrgId(config: ZohoConfig): Promise<string> {
  const token = await getAccessToken(config);
  const apiUrl = getApiUrl(config.dataCenter);

  const res = await fetch(`${apiUrl}/crm/v7/org`, {
    headers: { Authorization: `Zoho-oauthtoken ${token}` },
  });

  const data = await res.json();
  if (!data.org || !data.org[0]?.id) {
    throw new Error("Could not fetch Zoho org ID");
  }

  const orgId = data.org[0].id;

  // Save org ID
  await prisma.zohoConfig.update({
    where: { id: config.id },
    data: { orgId },
  });

  return orgId;
}

/**
 * Create a lead in Zoho CRM
 */
export async function createZohoLead(
  config: ZohoConfig,
  leadData: {
    customerName: string;
    customerEmail: string;
    projectName: string;
    phone?: string | null;
    city?: string | null;
    zip?: string | null;
    projectDescription: string;
    source?: string;
  }
): Promise<{ zohoLeadId: string }> {
  const token = await getAccessToken(config);
  const apiUrl = getApiUrl(config.dataCenter);

  // Split customer name into first/last
  const nameParts = leadData.customerName.trim().split(/\s+/);
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : nameParts[0];
  const firstName = nameParts.length > 1 ? nameParts[0] : undefined;

  const zohoData: Record<string, string | undefined> = {
    Last_Name: lastName,
    First_Name: firstName,
    Email: leadData.customerEmail,
    Company: leadData.projectName,
    Phone: leadData.phone || undefined,
    City: leadData.city || undefined,
    Zip_Code: leadData.zip || undefined,
    Description: leadData.projectDescription,
    Lead_Source: leadData.source === "BARK" ? "External Referral" : "Web Form",
  };

  // Remove undefined values
  const cleanData = Object.fromEntries(
    Object.entries(zohoData).filter(([, v]) => v !== undefined)
  );

  const res = await fetch(`${apiUrl}/crm/v7/Leads`, {
    method: "POST",
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ data: [cleanData] }),
  });

  const result = await res.json();

  if (result.data?.[0]?.code === "SUCCESS") {
    return { zohoLeadId: result.data[0].details.id };
  }

  // Handle duplicate
  if (result.data?.[0]?.code === "DUPLICATE_DATA") {
    const existingId = result.data[0].details?.id;
    if (existingId) {
      return { zohoLeadId: existingId };
    }
  }

  throw new Error(
    `Zoho create lead failed: ${result.data?.[0]?.message || result.message || JSON.stringify(result)}`
  );
}

/**
 * Search for a lead in Zoho CRM by email
 */
export async function searchZohoLead(
  config: ZohoConfig,
  email: string
): Promise<{ id: string; Email: string; Last_Name: string; First_Name?: string; Company?: string } | null> {
  const token = await getAccessToken(config);
  const apiUrl = getApiUrl(config.dataCenter);

  const res = await fetch(
    `${apiUrl}/crm/v7/Leads/search?email=${encodeURIComponent(email)}`,
    {
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
    }
  );

  if (res.status === 204) return null; // No content = no match

  const data = await res.json();
  if (data.data && data.data.length > 0) {
    return data.data[0];
  }

  return null;
}

/**
 * Get the direct URL to a lead in Zoho CRM
 */
export function getZohoLeadUrl(config: ZohoConfig, zohoLeadId: string): string {
  const crmUrl = getCrmUrl(config.dataCenter);
  if (config.orgId) {
    return `${crmUrl}/crm/org${config.orgId}/tab/Leads/${zohoLeadId}`;
  }
  return `${crmUrl}/crm/tab/Leads/${zohoLeadId}`;
}

/**
 * Check if Zoho integration is configured and enabled
 */
export async function isZohoEnabled(): Promise<boolean> {
  const config = await prisma.zohoConfig.findFirst();
  return !!config?.enabled && !!config?.refreshToken;
}
