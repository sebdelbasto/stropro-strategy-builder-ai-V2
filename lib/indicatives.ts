import type { Family } from "./families";

export function tenorBucket(m: number): string {
  if (m <= 12) return "≤12";
  if (m <= 24) return "13–24";
  if (m <= 36) return "25–36";
  if (m <= 60) return "37–60";
  return ">60";
}

export type UnderlierProfile = {
  isIndex: boolean;
  basketSize: number;
  region: "AU" | "US" | "EU" | "ASIA" | "OTHER";
  sectorHint?: "Banks" | "Resources" | "Tech" | "Other";
};

export function classifyUnderliers(codes: string[]): UnderlierProfile {
  const c = (codes || []).map(s => String(s||"").toUpperCase());
  const isIndex = c.every(x => /(SPX|SP500|NDX|NASDAQ|SX5E|EURO|ASX|XJO|HSI|DAX|FTSE|MSCI|ETF)/.test(x));
  const basketSize = Math.max(1, c.length);
  const anyAU = c.some(x => /(ASX|XJO|CBA|NAB|ANZ|WBC|MQG|BHP|RIO|VAS|A200)\b/.test(x));
  const anyUS = c.some(x => /(SPX|NDX|AAPL|MSFT|QQQ|SPY|AMZN|NVDA)/.test(x));
  const anyEU = c.some(x => /(SX5E|DAX|STOXX|CAC|EURO)/.test(x));
  const anyASIA = c.some(x => /(HSI|HSCEI|MCHI|KWEB|NIKKEI|TOPIX)/.test(x));
  const region: UnderlierProfile["region"] =
    anyAU ? "AU" : anyUS ? "US" : anyEU ? "EU" : anyASIA ? "ASIA" : "OTHER";
  const banks = c.some(x => /(CBA|NAB|ANZ|WBC|MQG|BANK|FINANC|XBK)/.test(x));
  const resources = c.some(x => /(BHP|RIO|FMG|MIN|GLEN|COPPER|IRON|GOLD)/.test(x));
  const tech = c.some(x => /(AAPL|MSFT|NVDA|META|GOOGL|AMZN|QQQ|NDX|NASDAQ)/.test(x));
  const sectorHint = banks ? "Banks" : resources ? "Resources" : tech ? "Tech" : "Other";
  return { isIndex, basketSize, region, sectorHint };
}

/** Heuristic illiquidity flag – single small-cap ticker or exotic asset */
export function illiquidHint(codes: string[]): string | undefined {
  const c = (codes || []).map(s => String(s||"").toUpperCase());
  const isIndex = c.every(x => /(SPX|NDX|SX5E|XJO|ETF|MSCI|DAX|FTSE|HSI)/.test(x));
  if (isIndex) return undefined;
  const BIG_CAPS = /(AAPL|MSFT|AMZN|GOOGL|META|NVDA|SPY|QQQ|VAS|ASX|XJO|CBA|NAB|ANZ|WBC|MQG|BHP|RIO|SX5E|SPX|NDX)/;
  const single = c.length === 1;
  const anyBig = c.some(x => BIG_CAPS.test(x));
  if (single && !anyBig) return "Note: selected underlier may be harder to price (single-name / liquidity). Ask the desk.";
  return undefined;
}

/** static, conservative family×tenor×ccy bands */
const BASE: Record<Family, Record<string, Record<string,string>>> = {
  "Fixed Coupon Note": {
    "≤12":  { AUD: "6–9% p.a. (illustrative only)",  USD: "7–10% p.a. (illustrative only)", EUR: "5–8% p.a. (illustrative only)" },
    "13–24":{ AUD: "7–11% p.a. (illustrative only)", USD: "8–12% p.a. (illustrative only)", EUR: "6–9% p.a. (illustrative only)" },
    "25–36":{ AUD: "8–12% p.a. (illustrative only)", USD: "9–13% p.a. (illustrative only)", EUR: "7–10% p.a. (illustrative only)" },
    "37–60":{ AUD: "9–13% p.a. (illustrative only)", USD: "10–14% p.a. (illustrative only)",EUR: "8–11% p.a. (illustrative only)" },
    ">60":  { AUD: "10–14% p.a. (illustrative only)",USD: "11–15% p.a. (illustrative only)",EUR: "9–12% p.a. (illustrative only)" }
  },
  "Smart-Entry Note": {
    "≤12":  { AUD: "5–8% p.a. (illustrative only)",  USD: "6–9% p.a. (illustrative only)",  EUR: "4–7% p.a. (illustrative only)" },
    "13–24":{ AUD: "6–10% p.a. (illustrative only)", USD: "7–11% p.a. (illustrative only)", EUR: "5–8% p.a. (illustrative only)" },
    "25–36":{ AUD: "7–11% p.a. (illustrative only)", USD: "8–12% p.a. (illustrative only)", EUR: "6–9% p.a. (illustrative only)" },
    "37–60":{ AUD: "8–12% p.a. (illustrative only)", USD: "9–13% p.a. (illustrative only)", EUR: "7–10% p.a. (illustrative only)" },
    ">60":  { AUD: "9–13% p.a. (illustrative only)",  USD: "10–14% p.a. (illustrative only)", EUR: "8–11% p.a. (illustrative only)" }
  },
  "Discount-Entry Note": {
    "≤12":  { AUD: "Entry discount ~15–25% (illustrative only)", USD: "15–25%", EUR: "15–25%" },
    "13–24":{ AUD: "Entry discount ~20–30% (illustrative only)", USD: "20–30%", EUR: "20–30%" },
    "25–36":{ AUD: "Entry discount ~20–35% (illustrative only)", USD: "20–35%", EUR: "20–35%" },
    "37–60":{ AUD: "Entry discount ~25–35% (illustrative only)", USD: "25–35%", EUR: "25–35%" },
    ">60":  { AUD: "Entry discount ~25–40% (illustrative only)", USD: "25–40%", EUR: "25–40%" }
  },
  "Principal Protected Note": {
    "≤12":  { AUD: "Participation ~90–140% (illustrative only)", USD: "90–140%", EUR: "90–130%" },
    "13–24":{ AUD: "Participation ~120–170% (illustrative only)", USD: "120–170%", EUR: "110–160%" },
    "25–36":{ AUD: "Participation ~130–180% (illustrative only)", USD: "130–180%", EUR: "120–170%" },
    "37–60":{ AUD: "Participation ~140–190% (illustrative only)", USD: "140–190%", EUR: "130–180%" },
    ">60":  { AUD: "Participation ~150–200% (illustrative only)", USD: "150–200%", EUR: "140–190%" }
  },
  "Protected Equity Loan": {
    "≤12":  { AUD: "LVR ~70–80% (illustrative only)", USD: "70–80%", EUR: "70–80%" },
    "13–24":{ AUD: "LVR ~70–85% (illustrative only)", USD: "70–85%", EUR: "70–85%" },
    "25–36":{ AUD: "LVR ~70–85% (illustrative only)", USD: "70–85%", EUR: "70–85%" },
    "37–60":{ AUD: "LVR ~70–85% (illustrative only)", USD: "70–85%", EUR: "70–85%" },
    ">60":  { AUD: "LVR ~70–85% (illustrative only)", USD: "70–85%", EUR: "70–85%" }
  },
  "Option & Loan Facility": {
    "≤12":  { AUD: "LVR ~70–80% (illustrative only)", USD: "70–80%", EUR: "70–80%" },
    "13–24":{ AUD: "LVR ~70–85% (illustrative only)", USD: "70–85%", EUR: "70–85%" },
    "25–36":{ AUD: "LVR ~70–85% (illustrative only)", USD: "70–85%", EUR: "70–85%" },
    "37–60":{ AUD: "LVR ~70–85% (illustrative only)", USD: "70–85%", EUR: "70–85%" },
    ">60":  { AUD: "LVR ~70–85% (illustrative only)", USD: "70–85%", EUR: "70–85%" }
  },
  "Hedging": {
    "≤12":  { AUD: "Premium depends on vol/strike; ask desk", USD: "Premium depends on vol/strike; ask desk", EUR: "Premium depends on vol/strike; ask desk" },
    "13–24":{ AUD: "Premium depends on vol/strike; ask desk", USD: "Premium depends on vol/strike; ask desk", EUR: "Premium depends on vol/strike; ask desk" },
    "25–36":{ AUD: "Premium depends on vol/strike; ask desk", USD: "Premium depends on vol/strike; ask desk", EUR: "Premium depends on vol/strike; ask desk" },
    "37–60":{ AUD: "Premium depends on vol/strike; ask desk", USD: "Premium depends on vol/strike; ask desk", EUR: "Premium depends on vol/strike; ask desk" },
    ">60":  { AUD: "Premium depends on vol/strike; ask desk", USD: "Premium depends on vol/strike; ask desk", EUR: "Premium depends on vol/strike; ask desk" }
  },
  "Enhanced Growth (ER/Lookback)": {
    "≤12":  { AUD: "Participation ~1.2–1.6× (illustrative only)", USD: "1.2–1.6×", EUR: "1.1–1.5×" },
    "13–24":{ AUD: "Participation ~1.3–1.8× (illustrative only)", USD: "1.3–1.8×", EUR: "1.2–1.7×" },
    "25–36":{ AUD: "Participation ~1.4–2.0× (illustrative only)", USD: "1.4–2.0×", EUR: "1.3–1.9×" },
    "37–60":{ AUD: "Participation ~1.5–2.2× (illustrative only)", USD: "1.5–2.2×", EUR: "1.4–2.0×" },
    ">60":  { AUD: "Participation ~1.6–2.3× (illustrative only)", USD: "1.6–2.3×", EUR: "1.5–2.1×" }
  },
  "Lending (LRL)": {
    "≤12":  { AUD: "Outlay ~3–6% of notional (illustrative only)", USD: "3–6%", EUR: "3–6%" },
    "13–24":{ AUD: "Outlay ~6–12% of notional (illustrative only)", USD: "6–12%", EUR: "6–12%" },
    "25–36":{ AUD: "Outlay ~9–18% of notional (illustrative only)", USD: "9–18%", EUR: "9–18%" },
    "37–60":{ AUD: "Outlay ~15–25% of notional (illustrative only)", USD: "15–25%", EUR: "15–25%" },
    ">60":  { AUD: "Outlay varies; ask desk", USD: "Outlay varies; ask desk", EUR: "Outlay varies; ask desk" }
  }
};

function parsePaBand(text?: string): [number, number] | null {
  if (!text) return null;
  const m = text.match(/(\d+(?:\.\d+)?)\s*[–-]\s*(\d+(?:\.\d+)?)\s*%/);
  if (!m) return null;
  return [parseFloat(m[1]), parseFloat(m[2])];
}
function fmtPa([a,b]: [number, number]): string {
  const lo = (Math.round(a*10)/10).toFixed(a%1?1:0);
  const hi = (Math.round(b*10)/10).toFixed(b%1?1:0);
  return `${lo}–${hi}% p.a. (illustrative only)`;
}

function adjustForUnderliers(family: Family, bandText: string, profile: UnderlierProfile): string {
  const range = parsePaBand(bandText);
  if (!range) return bandText;
  let [lo, hi] = range;

  const isIncome = family === "Fixed Coupon Note" || family === "Smart-Entry Note";
  if (isIncome) {
    if (!profile.isIndex && profile.basketSize <= 3) { lo += 1; hi += 1; }
    if (profile.isIndex && profile.basketSize >= 4) { lo -= 0.5; hi -= 0.5; }
    if (profile.region === "AU" && profile.sectorHint === "Banks") { lo += 0.5; hi += 0.5; }
  }

  const base = parsePaBand(bandText)!;
  lo = Math.min(base[0] + 2, Math.max(base[0] - 2, lo));
  hi = Math.min(base[1] + 2, Math.max(base[1] - 2, hi));
  if (hi < lo) hi = lo;

  return fmtPa([lo, hi]);
}

export function fallbackBand(family: Family, tenorMonths: number, ccy: string): string | undefined {
  const bucket = tenorBucket(tenorMonths);
  return BASE[family]?.[bucket]?.[ccy.toUpperCase()];
}

export function computeIndicativeBand(opts: {
  family: Family;
  tenorMonths: number;
  currency: string;
  underliers: string[];
  platformBand?: string;
}): string | undefined {
  const { family, tenorMonths, currency, underliers, platformBand } = opts;
  if (platformBand) return platformBand;
  const profile = classifyUnderliers(underliers || []);
  const base = fallbackBand(family, tenorMonths, currency);
  if (!base) return base;
  return adjustForUnderliers(family, base, profile);
}
