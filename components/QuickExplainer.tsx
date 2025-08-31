'use client'
import { getFamilyExplainer } from '@/lib/familyExplainers'

export default function QuickExplainer({ family }: { family: string | undefined }) {
  if (!family) return null
  try {
    // @ts-ignore
    const ex = getFamilyExplainer(family)
    return (
      <details className="mt-2">
        <summary className="small underline cursor-pointer">Quick explainer</summary>
        <div className="mt-2 small space-y-2">
          <div>
            <div className="font-medium">What it is</div>
            <ul className="list-disc ml-5">{ex.what.map((x:string,i:number)=>(<li key={i}>{x}</li>))}</ul>
          </div>
          <div>
            <div className="font-medium">When to use</div>
            <ul className="list-disc ml-5">{ex.when.map((x:string,i:number)=>(<li key={i}>{x}</li>))}</ul>
          </div>
          <div>
            <div className="font-medium">Key risks</div>
            <ul className="list-disc ml-5">{ex.risks.map((x:string,i:number)=>(<li key={i}>{x}</li>))}</ul>
          </div>
        </div>
      </details>
    )
  } catch { return null }
}
