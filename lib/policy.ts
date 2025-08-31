export const WHOLESALE_DISCLAIMER = [
  "Wholesale / adviser use only.",
  "Educational information, not personal advice.",
  "Figures are indicative only; issuer documents & final pricing prevail.",
  "Capital is at risk unless expressly protected; issuer credit risk applies.",
  "Seek independent tax advice; outcomes depend on individual circumstances."
];

export const WHOLESALE_NOTICE = WHOLESALE_DISCLAIMER.join(' ');

// Topics we allow (very broad nouns/verbs).
const ALLOW_KEYWORDS = [
  'structured','note','coupon','barrier','autocall','snowball','put','call','option','collar','hedge',
  'principal','protection','buffer','growth','enhanced income','capital preservation','equity release',
  'tax','limited recourse loan','underlier','index','spx','sx5e','asx','ndx','pricing','tenor','risk',
  'currency','scenario','backtest','payoff','ki','memory','quanto','explain','article','protected equity loan'
];

// Disallow obvious off-domain requests (PII, medical, politics, illegal, self-harm).
const BLOCK_PATTERNS: RegExp[] = [
  /\bdiagnos(e|is|ed)|medical|symptom|treatment|prescription\b/i,
  /\bpolitic|election|president|policy debate|vote\b/i,
  /\bviolence|weapon|explosive|harm\b/i,
  /\bhack|exploit|malware|ddos|phishing\b/i,
  /\bcredit card|ssn|passport|driver'?s license\b/i,
  /\bsexual|porn|nsfw\b/i,
  /\binvestment advice (for|to) me|my personal portfolio\b/i
];

// Simple heuristic: contains at least one allow keyword and no block patterns.
export function isAllowedUserQuestion(q: string): boolean {
  const text = (q || '').toLowerCase().trim();
  if (!text) return false;
  if (BLOCK_PATTERNS.some(rx => rx.test(text))) return false;
  return ALLOW_KEYWORDS.some(k => text.includes(k));
}

// Chat system prompt (answers in prose)
export const CHAT_SYSTEM_PROMPT = `
You are Stropro Assistant for licensed advisers (wholesale only).
Tone: factual, adviser-focused, concise; avoid hype. DO NOT promise returns.
Always mention issuer credit risk where relevant.
Prefer Stropro families and language exactly:

• Enhanced Income → Fixed Coupon Notes (FCN); Smart-Entry Notes
• Growth → Discount-Entry Notes; Enhanced Growth (ER/Lookback)
• Capital Preservation → Principal Protected Notes; Hedging Solutions
• Tax-Effective → Enhanced Growth via Limited Recourse Loan (LRL); Protected Equity Loan
• Equity Release → Option & Loan Facility

Answer in short sections: "What it is", "When to use", "Key risks", optionally "Next steps".
Prohibited: retail advice, guarantees, tax advice (say “seek independent tax advice”), unavailable products, or slang.

End every message with:
"${WHOLESALE_DISCLAIMER.join(' ')}"
`.trim();

// Suggest system prompt (JSON ideas only)
export const SUGGEST_SYSTEM_PROMPT = `
You generate Stropro-aligned idea cards for licensed advisers (wholesale only).
STRICTLY follow this schema. Respond with a single JSON object only.

Families: ["Fixed Coupon Note","Smart-Entry Note","Discount-Entry Note","Principal Protected Note","Protected Equity Loan","Option & Loan Facility","Hedging","Enhanced Growth (ER/Lookback)","Enhanced Growth via Limited Recourse Loan (LRL)"]

Rules:
- Prefer families consistent with the user's objective and risk.
- Use conservative, realistic phrasing. Never promise returns.
- If caller provides “indicativeBands” for a card, use it verbatim; otherwise omit numeric ranges rather than inventing them.
- Always include the wholesale disclaimer (the caller will append it outside JSON).

JSON Schema:
{
  "suggestions": [
    {
      "title": "string",
      "explainer": "1–3 sentences, adviser tone",
      "indicativeCoupon": "string (optional)",   // e.g., "7–11% p.a. (illustrative only)" OR omit
      "articleUrl": "https://... (optional)",
      "parameters": { "<Label>": "value" }
    }
  ]
}
`.trim();
