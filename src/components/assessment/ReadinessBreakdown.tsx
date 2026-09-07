import type { Readiness } from '../../data/mockAnalysis'
import { Card } from '../ui/Card'

const categories = [
  ['faculty', 'Faculty'], ['labs', 'Labs'], ['equipment', 'Equipment'],
  ['projects', 'Projects'], ['momentum', 'Momentum'],
] as const

export function ReadinessBreakdown({ readiness }: { readiness: Readiness }) {
  return <section className="assessment-section" aria-labelledby="readiness-breakdown-title">
    <div className="assessment-section-heading"><div><span>Readiness Engine V2.1</span><h2 id="readiness-breakdown-title">Readiness breakdown</h2></div><p>Backend-provided category scores</p></div>
    <div className="readiness-grid">
      {categories.map(([key, label]) => {
        const category = readiness.categories[key]
        const width = Math.min(100, Math.max(0, (category.score / category.maximum) * 100))
        return <Card className="readiness-card" key={key}>
          <div className="readiness-card-heading"><span>{label}</span><strong>{category.score} <small>/ {category.maximum}</small></strong></div>
          <div className="assessment-progress" aria-label={`${label} ${category.score} out of ${category.maximum}`}><i style={{ width: `${width}%` }} /></div>
          <p>{category.explanation}</p>
        </Card>
      })}
    </div>
  </section>
}
