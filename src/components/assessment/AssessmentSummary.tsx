import type { CampusForgeAnalysis } from '../../data/mockAnalysis'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'

export function AssessmentSummary({ analysis }: { analysis: CampusForgeAnalysis }) {
  const { opportunity, readiness, researchTrend } = analysis
  const readinessPercent = Math.min(100, Math.max(0, (readiness.score / readiness.maximum) * 100))

  return <section className="assessment-summary" aria-labelledby="assessment-title">
    <Card className="assessment-summary-card">
      <div className="assessment-summary-copy">
        <div className="assessment-summary-labels">
          <span>Opportunity assessment</span>
          <Badge>{opportunity.verdict}</Badge>
        </div>
        <h2 id="assessment-title">{opportunity.title}</h2>
        <p>{opportunity.rationale}</p>
      </div>
      <div className="assessment-summary-metrics">
        <div className="assessment-primary-metric">
          <strong>{readiness.score} <small>/ {readiness.maximum}</small></strong>
          <span>Readiness</span>
          <div className="assessment-progress" aria-label={`Readiness ${readiness.score} out of ${readiness.maximum}`}>
            <i style={{ width: `${readinessPercent}%` }} />
          </div>
        </div>
        <div><strong>{readiness.confidence}%</strong><span>Evidence completeness</span></div>
        <div><strong>{researchTrend.momentum}</strong><span>Research momentum</span></div>
      </div>
      <p className="assessment-disclaimer">{readiness.disclaimer}</p>
    </Card>
  </section>
}
