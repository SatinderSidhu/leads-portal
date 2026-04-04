import naicsData from "./naics-data.json";

interface NaicsResolution {
  naicsSectorCode: string | null;
  naicsSubsectorCode: string | null;
}

// Common Apollo/LinkedIn industry strings → NAICS sector or subsector code
const INDUSTRY_ALIAS_MAP: Record<string, { sector: string; subsector?: string }> = {
  // Information / Technology
  "information technology and services": { sector: "51" },
  "information technology": { sector: "51" },
  "computer software": { sector: "51", subsector: "511" },
  "internet": { sector: "51", subsector: "519" },
  "telecommunications": { sector: "51", subsector: "517" },
  "computer & network security": { sector: "51" },
  "computer networking": { sector: "51" },
  "computer hardware": { sector: "51", subsector: "334" },
  "semiconductors": { sector: "51", subsector: "334" },
  "information services": { sector: "51" },
  "online media": { sector: "51", subsector: "519" },
  "broadcast media": { sector: "51", subsector: "515" },
  "publishing": { sector: "51", subsector: "511" },
  "media production": { sector: "51", subsector: "512" },

  // Finance / Insurance
  "financial services": { sector: "52" },
  "banking": { sector: "52", subsector: "522" },
  "investment banking": { sector: "52", subsector: "523" },
  "investment management": { sector: "52", subsector: "523" },
  "venture capital & private equity": { sector: "52", subsector: "523" },
  "capital markets": { sector: "52", subsector: "523" },
  "insurance": { sector: "52", subsector: "524" },
  "accounting": { sector: "54", subsector: "541" },

  // Real Estate
  "real estate": { sector: "53" },
  "commercial real estate": { sector: "53", subsector: "531" },

  // Professional Services
  "management consulting": { sector: "54", subsector: "541" },
  "legal services": { sector: "54", subsector: "541" },
  "marketing and advertising": { sector: "54", subsector: "541" },
  "market research": { sector: "54", subsector: "541" },
  "design": { sector: "54", subsector: "541" },
  "architecture & planning": { sector: "54", subsector: "541" },
  "public relations and communications": { sector: "54", subsector: "541" },
  "research": { sector: "54", subsector: "541" },
  "graphic design": { sector: "54", subsector: "541" },
  "staffing and recruiting": { sector: "56", subsector: "561" },
  "human resources": { sector: "56", subsector: "561" },
  "outsourcing/offshoring": { sector: "56" },
  "facilities services": { sector: "56", subsector: "561" },
  "security and investigations": { sector: "56", subsector: "561" },
  "environmental services": { sector: "56", subsector: "562" },

  // Healthcare
  "hospital & health care": { sector: "62" },
  "health, wellness and fitness": { sector: "62" },
  "medical devices": { sector: "62", subsector: "621" },
  "medical practice": { sector: "62", subsector: "621" },
  "mental health care": { sector: "62", subsector: "621" },
  "pharmaceuticals": { sector: "31-33", subsector: "325" },
  "biotechnology": { sector: "54", subsector: "541" },

  // Education
  "education management": { sector: "61" },
  "higher education": { sector: "61", subsector: "611" },
  "primary/secondary education": { sector: "61", subsector: "611" },
  "e-learning": { sector: "61", subsector: "611" },

  // Manufacturing
  "automotive": { sector: "31-33", subsector: "336" },
  "machinery": { sector: "31-33", subsector: "333" },
  "electrical/electronic manufacturing": { sector: "31-33", subsector: "335" },
  "food & beverages": { sector: "31-33", subsector: "311" },
  "consumer goods": { sector: "31-33" },
  "textiles": { sector: "31-33", subsector: "313" },
  "chemicals": { sector: "31-33", subsector: "325" },
  "plastics": { sector: "31-33", subsector: "326" },
  "paper & forest products": { sector: "31-33", subsector: "322" },
  "building materials": { sector: "31-33", subsector: "327" },

  // Construction
  "construction": { sector: "23" },
  "building products": { sector: "23" },
  "civil engineering": { sector: "23", subsector: "237" },

  // Retail / Wholesale
  "retail": { sector: "44-45" },
  "consumer electronics": { sector: "44-45" },
  "apparel & fashion": { sector: "44-45" },
  "luxury goods & jewelry": { sector: "44-45" },
  "sporting goods": { sector: "44-45" },
  "wholesale": { sector: "42" },
  "import and export": { sector: "42" },

  // Transportation
  "logistics and supply chain": { sector: "48-49" },
  "transportation/trucking/railroad": { sector: "48-49" },
  "airlines/aviation": { sector: "48-49", subsector: "481" },
  "maritime": { sector: "48-49", subsector: "483" },
  "warehousing": { sector: "48-49", subsector: "493" },
  "package/freight delivery": { sector: "48-49", subsector: "492" },

  // Hospitality
  "hospitality": { sector: "72" },
  "restaurants": { sector: "72", subsector: "722" },
  "food production": { sector: "31-33", subsector: "311" },
  "leisure, travel & tourism": { sector: "72" },

  // Government / Public
  "government administration": { sector: "92" },
  "government relations": { sector: "92" },
  "military": { sector: "92" },
  "law enforcement": { sector: "92" },
  "public safety": { sector: "92" },
  "public policy": { sector: "92" },
  "political organization": { sector: "92" },
  "judiciary": { sector: "92" },
  "legislative office": { sector: "92" },

  // Other
  "nonprofit organization management": { sector: "81" },
  "religious institutions": { sector: "81" },
  "arts and crafts": { sector: "71" },
  "entertainment": { sector: "71" },
  "performing arts": { sector: "71", subsector: "711" },
  "sports": { sector: "71", subsector: "711" },
  "gambling & casinos": { sector: "71", subsector: "713" },
  "farming": { sector: "11", subsector: "111" },
  "agriculture": { sector: "11" },
  "mining & metals": { sector: "21" },
  "oil & energy": { sector: "21", subsector: "211" },
  "renewables & environment": { sector: "22" },
  "utilities": { sector: "22", subsector: "221" },
};

const STOP_WORDS = new Set(["and", "of", "the", "in", "for", "a", "an", "or", "&", "-", "/", "services", "management"]);

/**
 * Checks if a 2-digit code falls within a range-format sector code like "31-33"
 */
function matchesSectorCode(inputCode: string, sectorCode: string): boolean {
  if (sectorCode === inputCode) return true;
  if (sectorCode.includes("-")) {
    const [start, end] = sectorCode.split("-").map(Number);
    const num = parseInt(inputCode, 10);
    if (!isNaN(start) && !isNaN(end) && !isNaN(num)) {
      return num >= start && num <= end;
    }
  }
  return false;
}

/**
 * Resolve NAICS sector/subsector codes from direct codes or industry text.
 * Priority: direct codes > alias map > contains match > keyword scoring
 */
export function resolveNaicsCodes(input: {
  naicsSectorCode?: string | null;
  naicsSubsectorCode?: string | null;
  industry?: string | null;
}): NaicsResolution {
  const { sectors, subsectors } = naicsData;

  // 1. Direct sector code provided — validate
  if (input.naicsSectorCode) {
    const validSector = sectors.find((s) => matchesSectorCode(input.naicsSectorCode!, s.code));
    if (validSector) {
      let validSubsector: string | null = null;
      if (input.naicsSubsectorCode) {
        const sub = subsectors.find((s) => s.code === input.naicsSubsectorCode);
        if (sub) validSubsector = sub.code;
      }
      return { naicsSectorCode: validSector.code, naicsSubsectorCode: validSubsector };
    }
  }

  // 2. Only subsector code provided — derive sector
  if (input.naicsSubsectorCode && !input.naicsSectorCode) {
    const sub = subsectors.find((s) => s.code === input.naicsSubsectorCode);
    if (sub) {
      const parentSector = sectors.find((s) => s.name === sub.parentSector);
      if (parentSector) {
        return { naicsSectorCode: parentSector.code, naicsSubsectorCode: sub.code };
      }
    }
  }

  // 3. No valid codes — try matching from industry text
  const industry = input.industry?.trim();
  if (!industry) return { naicsSectorCode: null, naicsSubsectorCode: null };

  const industryLower = industry.toLowerCase();

  // 3a. Alias map (most reliable for Apollo data)
  const alias = INDUSTRY_ALIAS_MAP[industryLower];
  if (alias) {
    return {
      naicsSectorCode: alias.sector,
      naicsSubsectorCode: alias.subsector || null,
    };
  }

  // 3b. Contains match against sector names
  for (const sector of sectors) {
    if (sector.name.toLowerCase().includes(industryLower) || industryLower.includes(sector.name.toLowerCase())) {
      return { naicsSectorCode: sector.code, naicsSubsectorCode: null };
    }
  }

  // 3c. Contains match against subsector names
  for (const sub of subsectors) {
    if (sub.name.toLowerCase().includes(industryLower) || industryLower.includes(sub.name.toLowerCase())) {
      const parentSector = sectors.find((s) => s.name === sub.parentSector);
      return {
        naicsSectorCode: parentSector?.code || null,
        naicsSubsectorCode: sub.code,
      };
    }
  }

  // 3d. Keyword tokenization scoring
  const tokens = industryLower.split(/[\s\/&,\-]+/).filter((t) => t.length > 2 && !STOP_WORDS.has(t));
  if (tokens.length === 0) return { naicsSectorCode: null, naicsSubsectorCode: null };

  let bestSector: { code: string; score: number } | null = null;
  for (const sector of sectors) {
    const sectorLower = sector.name.toLowerCase();
    const score = tokens.filter((t) => sectorLower.includes(t)).length;
    if (score > 0 && (!bestSector || score > bestSector.score)) {
      bestSector = { code: sector.code, score };
    }
  }

  if (bestSector) {
    return { naicsSectorCode: bestSector.code, naicsSubsectorCode: null };
  }

  return { naicsSectorCode: null, naicsSubsectorCode: null };
}
