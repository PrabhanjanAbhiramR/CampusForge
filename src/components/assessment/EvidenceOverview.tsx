import type { CanonicalEvidence } from '../../data/mockAnalysis'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'

const domains = [
  ['faculty', 'Faculty'], ['labs', 'Labs'], ['equipment', 'Equipment'],
  ['projects', 'Projects'], ['trends', 'Research trend'],
] as const

export function EvidenceOverview({ evidence }: { evidence: CanonicalEvidence }) {
  return <section className="assessment-section" aria-labelledby="evidence-overview-title">
    <div className="assessment-section-heading"><div><span>Canonical evidence</span><h2 id="evidence-overview-title">Evidence overview</h2></div><p>Direct and supporting records returned by the analysis</p></div>
    <div className="evidence-overview-grid">
      {domains.map(([key, label]) => {
        const direct = evidence[key].direct.length
        const supporting = evidence[key].adjacent.length
        return <Card className="evidence-overview-card" key={key}>
          <h3>{label}</h3><strong>{direct + supporting}</strong><span>Total records</span>
          <div><Badge variant="direct">Direct {direct}</Badge><Badge variant="supporting">Supporting {supporting}</Badge></div>
        </Card>
      })}
    </div>
  </section>
}
