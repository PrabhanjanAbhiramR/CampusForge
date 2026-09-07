import type { CapabilityGap } from '../../data/mockAnalysis'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'

export function CapabilityGaps({ gaps }: { gaps: CapabilityGap[] }) {
  return <section className="assessment-section" aria-labelledby="capability-gaps-title">
    <div className="assessment-section-heading"><div><span>Capabilities to validate</span><h2 id="capability-gaps-title">Capability gaps</h2></div></div>
    {gaps.length ? <div className="assessment-gap-list">{gaps.map((gap) => <Card className="assessment-gap-card" key={gap.id}>
      <Badge variant="warning">Inferred gap</Badge><h3>{gap.title}</h3><p>{gap.explanation}</p>
    </Card>)}</div> : <p className="assessment-empty">No capability gaps were identified in the returned analysis.</p>}
    <p className="assessment-note">Missing evidence does not necessarily mean the capability is absent across the institution.</p>
  </section>
}
