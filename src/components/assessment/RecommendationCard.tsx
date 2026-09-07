import type { Recommendation } from '../../data/mockAnalysis'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'

export function RecommendationCard({ recommendation }: { recommendation: Recommendation }) {
  return <section className="assessment-section" aria-labelledby="recommendation-title">
    <Card className="assessment-recommendation-card">
      <Badge variant="default">Recommendation</Badge>
      <span className="recommendation-kind">{recommendation.evidenceKind}</span>
      <h2 id="recommendation-title">{recommendation.verdict}</h2>
      <p>{recommendation.summary}</p>
    </Card>
  </section>
}
