import { NextResponse } from 'next/server';
import { fetchRecentProducts, selectSimilar, bandFromProducts } from '@/lib/catalog';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const inputs = (await req.json().catch(() => null)) || {};
  const {
    objective = 'Enhanced Income',
    underliers = ['SPX'],
    tenorMonths = 24,
    investmentCurrency = 'AUD'
  } = inputs;
  try {
    const recents = await fetchRecentProducts(250);
    const cohort = selectSimilar(recents, {
      objective,
      underliers,
      tenor: tenorMonths,
      currency: (investmentCurrency || 'AUD').toUpperCase()
    });
    const { band, sampleSize } = bandFromProducts(cohort);
    return NextResponse.json({
      input: { objective, underliers, tenorMonths, investmentCurrency },
      sampleSize,
      band,
      samplePeek: cohort.slice(0, 8).map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        currency: p.currency,
        tenorMonths: p.tenorMonths,
        underliers: p.underliers,
        couponPct: p.couponPct
      }))
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
