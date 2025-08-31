const BASE = process.env.STROPRO_API_BASE || 'https://portal.stropro.com/api'
const RAW = process.env.STROPRO_API_KEY || ''
const AUTH = RAW ? (RAW.startsWith('Bearer ') ? RAW : `Bearer ${RAW}`) : ''

type AnyObj = Record<string, any>
export type NormProduct = {
  id?: string
  name?: string
  type?: string
  currency?: string
  tenorMonths?: number
  underliers?: string[]
  couponPct?: number | null
  createdAt?: number
}

const cache = new Map<string,{t:number, ttl:number, v:any}>()
const TTL = 10*60*1000
const now = () => Date.now()
function getC(key:string){ const h = cache.get(key); if (h && now()-h.t < h.ttl) return h.v; if (h) cache.delete(key); }
function setC(key:string, v:any, ttl=TTL){ cache.set(key, {t:now(), ttl, v}) }

async function apiGet(path:string, params?:AnyObj) {
  if (!BASE || !AUTH) throw new Error('Missing STROPRO_API_BASE or STROPRO_API_KEY')
  // If BASE already ends with /api, ensure we don't duplicate it
  // e.g., BASE=https://portal.stropro.com/api and path='api/products' -> 'products'
  const cleaned = path.replace(/^\/?api\//, '').replace(/^\//,'')
  const url = new URL(cleaned, BASE.endsWith('/') ? BASE : BASE + '/')
  if (params) Object.entries(params).forEach(([k,v])=>{
    if (v!==undefined && v!==null && v!=='') url.searchParams.set(k, String(v))
  })
  const ck = `GET ${url}`
  const hit = getC(ck); if (hit) return hit
  const r = await fetch(url.toString(), { method:'GET', headers:{ Accept:'application/json', Authorization: AUTH }, next:{ revalidate:600 } })
  if (!r.ok) {
    const txt = await r.text().catch(()=> '')
    throw new Error(`Platform ${url.pathname} ${r.status}: ${txt.slice(0,200)}`)
  }
  const data = await r.json().catch(()=>null)
  setC(ck, data)
  return data
}

function parsePct(s:any): number | null {
  if (typeof s === 'number' && isFinite(s)) return s
  if (typeof s === 'string') {
    const m = s.match(/(\d+(?:\.\d+)?)\s*%/); if (m) return parseFloat(m[1])
    const n = Number(s); if (isFinite(n)) return n
  }
  return null
}
function fromTextPct(...parts:(string|undefined)[]): number | null {
  const s = parts.filter(Boolean).join(' ')
  const m = s.match(/(\d+(?:\.\d+)?)\s*%/); if (m) return parseFloat(m[1])
  return null
}
function monthsFromTenor(x:any): number | undefined {
  if (typeof x === 'number' && isFinite(x)) return x
  if (typeof x === 'string') {
    const m = x.match(/(\d+(?:\.\d+)*)\s*(m|months?)/i); if (m) return Math.round(parseFloat(m[1]))
    const y = x.match(/(\d+(?:\.\d+)*)\s*(y|years?)/i); if (y) return Math.round(parseFloat(y[1]) * 12)
    const n = Number(x); if (isFinite(n)) return n
  }
  return undefined
}
function normUnderliers(u:any): string[] {
  if (!u) return []
  const arr = Array.isArray(u) ? u : (typeof u === 'string' ? u.split(/[,\|]/) : [])
  return arr.map(s => String(s||'').trim().toUpperCase()).filter(Boolean)
}

export function normalizeProduct(p:any): NormProduct {
  const createdAt = new Date(p.createdAt || p.issueDate || p.updatedAt || Date.now()).getTime()
  const couponPct = parsePct(p.couponPct) ?? parsePct(p.coupon_pa) ?? parsePct(p.coupon) ??
                    parsePct(p.yield) ?? fromTextPct(p.title, p.name, p.description)
  const tenorMonths = monthsFromTenor(p.tenor || p.tenorMonths || p.term || p.maturity)
  const underliers = normUnderliers(p.underliers || p.underlying || p.underlyingAssets || p.assets)
  const typeText = [p.productType, p.type, p.category, p.family, p.name, p.title].filter(Boolean).join(' ')
  const currency = (p.currency || p.ccy || '').toString().toUpperCase() || undefined
  return { id: p.id || p.productId || p._id, name: p.name || p.title, type: typeText, currency, tenorMonths, underliers, couponPct, createdAt }
}

export async function fetchRecentProducts(limit=250) : Promise<NormProduct[]> {
  let items:any[] = []
  try {
    const pg1 = await apiGet('products', { page:1, size:100, sort:'createdAt,desc' }).catch(()=>null)
    if (pg1?.items?.length) {
      items = pg1.items
      if (pg1.totalPages && pg1.totalPages > 1) {
        const pg2 = await apiGet('products', { page:2, size:100, sort:'createdAt,desc' }).catch(()=>null)
        if (pg2?.items?.length) items = items.concat(pg2.items)
        if (pg1.totalPages > 2) {
          const pg3 = await apiGet('products', { page:3, size:100, sort:'createdAt,desc' }).catch(()=>null)
          if (pg3?.items?.length) items = items.concat(pg3.items)
        }
      }
    } else {
      const all = await apiGet('products', { limit }).catch(()=>null)
      items = Array.isArray(all) ? all : (all?.items || [])
    }
  } catch { /* swallow */ }
  return items.map(normalizeProduct)
}

const OBJ_FAMILIES: Record<string,RegExp[]> = {
  'Enhanced Income': [/fixed coupon|autocall|snowball|income|smart[-\s]?entry/i],
  'Capital Preservation': [/principal protected|capital protected|ppn|hedge/i],
  'Growth': [/enhanced growth|leveraged call|discount[-\s]?entry|participation/i],
  'Tax-Effective': [/limited recourse loan|lrl|enhanced growth via lrl/i],
  'Equity Release': [/option.*loan|equity release/i],
}

function scoreSimilarity(p:NormProduct, target:{ objective:string, underliers:string[], tenor:number, currency:string }) {
  let s = 0
  const fams = OBJ_FAMILIES[target.objective] || []
  if (fams.length) {
    const hay = (p.type || '').toString()
    if (fams.some(rx => rx.test(hay))) s += 3
  }
  const U = new Set((target.underliers||[]).map(x=>x.toUpperCase()))
  if (U.size && p.underliers?.length) {
    const inter = p.underliers.filter(u => U.has(u)).length
    if (inter) s += 2 + inter*0.5
  }
  if (p.tenorMonths && target.tenor) {
    const diff = Math.abs(p.tenorMonths - target.tenor)
    if (diff <= 6) s += 1.5
    else if (diff <= 12) s += 0.75
  }
  if (p.currency && target.currency && p.currency === target.currency) s += 1
  const ageM = (Date.now() - (p.createdAt||Date.now())) / (30*24*3600*1000)
  if (ageM < 6) s += 1
  else if (ageM < 12) s += 0.5
  return s
}

export function selectSimilar(products:NormProduct[], target:{ objective:string, underliers:string[], tenor:number, currency:string }, topN=120) {
  const scored = products
    .map(p => ({ p, s: scoreSimilarity(p, target) }))
    .filter(x => x.s > 0.99)
    .sort((a,b)=> b.s - a.s)
    .slice(0, topN)
    .map(x => x.p)
  return scored
}

export function bandFromProducts(arr:NormProduct[]) {
  const vals = arr.map(p => p.couponPct).filter((n): n is number => typeof n==='number' && isFinite(n)).sort((a,b)=>a-b)
  const n = vals.length
  if (!n) return { band: undefined, sampleSize: 0 }
  const p25i = Math.floor(0.25*(n-1)), p75i = Math.floor(0.75*(n-1))
  const p25 = vals[p25i], p75 = vals[p75i]
  const band = n>=4 ? `${p25.toFixed(1)}–${p75.toFixed(1)}% p.a. (illustrative only)`
           : n>=2 ? `${vals[0].toFixed(1)}–${vals[n-1].toFixed(1)}% p.a. (illustrative only)`
           : `${(vals[0]-1).toFixed(1)}–${(vals[0]+1).toFixed(1)}% p.a. (illustrative only)`
  return { band, sampleSize: n }
}
