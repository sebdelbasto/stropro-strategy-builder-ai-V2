export const WHOLESALE_NOTICE =
  'For licensed advisers / wholesale clients. Educational only—not personal advice. Terms, docs & KIDs prevail.'

// Topics we allow (very broad nouns/verbs).
const ALLOW_KEYWORDS = [
  'structured', 'note', 'coupon', 'barrier', 'autocall', 'snowball', 'put', 'call',
  'option', 'collar', 'hedge', 'principal', 'protection', 'buffer', 'growth',
  'enhanced income', 'capital preservation', 'equity release', 'tax', 'limited recourse loan',
  'underlier', 'index', 'spx', 'sx5e', 'asx', 'ndx', 'pricing', 'tenor', 'risk', 'currency',
  'scenario', 'backtest', 'payoff', 'ki', 'autocall', 'memory', 'quanto', 'explain', 'article'
]

// Disallow obvious off-domain requests (PII, medical, politics, illegal, self-harm).
const BLOCK_PATTERNS: RegExp[] = [
  /\bdiagnos(e|is|ed)|medical|symptom|treatment|prescription\b/i,
  /\bpolitic|election|president|policy debate|vote\b/i,
  /\bviolence|weapon|explosive|harm\b/i,
  /\bhack|exploit|malware|ddos|phishing\b/i,
  /\bcredit card|ssn|passport|driver'?s license\b/i,
  /\bsexual|porn|nsfw\b/i,
  /\binvestment advice (for|to) me|my personal portfolio\b/i
]

// Simple heuristic: contains at least one allow keyword and no block patterns.
export function isAllowedUserQuestion(q: string): boolean {
  const text = (q || '').toLowerCase()
  if (!text.trim()) return false
  if (BLOCK_PATTERNS.some(rx => rx.test(text))) return false
  const hit = ALLOW_KEYWORDS.some(k => text.includes(k))
  return hit
}
