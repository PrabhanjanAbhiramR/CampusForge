import { Badge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'
import { campusEquipment, campusFaculty, campusLabs, campusProjects } from '../data/campusData'
import { mockAnalysis } from '../data/mockAnalysis'

const availableUnderHalfUtilization = campusEquipment.filter(
  (equipment) => equipment.status === 'Available' && equipment.utilization < 50,
)

const capabilityStrengths = [
  {
    title: 'Edge intelligence and embedded systems',
    evidence: 'Edge AI, embedded AI, IoT, and sensor-network expertise appears across three faculty profiles and the IoT & Embedded Systems Lab.',
  },
  {
    title: 'Computer vision and image-based research',
    evidence: 'Computer vision expertise, the AI & Intelligent Systems Lab, image-acquisition equipment, and two related projects form a reusable capability base.',
  },
  {
    title: 'Autonomous and distributed systems',
    evidence: 'The prototype register includes robotics, machine perception, federated learning, distributed systems, and active autonomous-systems work.',
  },
]

const reuseOpportunities = [
  {
    title: 'Reuse crop sensing data for edge vision validation',
    projectIds: ['P001', 'P003', 'P002'],
    rationale: 'Sensor observations and crop imagery could provide a shared validation pathway for low-power inference and plant-disease models.',
  },
  {
    title: 'Extend distributed learning into campus robotics',
    projectIds: ['P005', 'P004'],
    rationale: 'The planned privacy-aware learning work could explore model updates across mobile platforms without centralizing all captured data.',
  },
]

function projectTitles(ids: string[]) {
  return ids.map((id) => campusProjects.find((project) => project.id === id)?.title).filter((title): title is string => Boolean(title))
}

export function InsightsPage() {
  return <div className="insights-page">
    <header className="page-header">
      <p className="eyebrow">Prototype evidence synthesis</p>
      <h1>Campus Insights</h1>
      <p className="page-intro">Review directly reported resource evidence alongside interpretations of where campus capabilities may be combined or strengthened.</p>
    </header>

    <section className="insights-summary-grid" aria-label="Campus evidence summary">
      <Card className="insights-summary-card"><span>Indexed faculty</span><strong>{campusFaculty.length}</strong><p>Faculty profiles in the prototype register</p></Card>
      <Card className="insights-summary-card"><span>Indexed labs</span><strong>{campusLabs.length}</strong><p>Research labs in the prototype register</p></Card>
      <Card className="insights-summary-card"><span>Indexed projects</span><strong>{campusProjects.length}</strong><p>Ongoing, completed, and prototype projects</p></Card>
      <Card className="insights-summary-card"><span>Available capacity</span><strong>{availableUnderHalfUtilization.length}</strong><p>Available assets below 50% reported utilization</p></Card>
    </section>

    <div className="insights-evidence-legend" aria-label="Evidence classification">
      <span><Badge variant="direct">Dataset evidence</Badge>Directly represented in shared prototype records.</span>
      <span><Badge variant="supporting">Inferred insight</Badge>Interpretation derived from those records.</span>
    </div>

    <section className="insights-dashboard-section" aria-labelledby="available-equipment-title">
      <div className="insights-section-heading"><div><Badge variant="direct">Dataset evidence</Badge><p className="register-kicker">Reported capacity</p><h2 id="available-equipment-title">Available equipment below 50% utilization</h2></div><span>Prototype inventory</span></div>
      <Card className="insights-equipment-card">
        <div className="insights-table-wrap" role="region" aria-label="Available equipment table" tabIndex={0}><table className="insights-table">
          <thead><tr><th scope="col">Equipment</th><th scope="col">Supporting lab</th><th scope="col">Capability</th><th scope="col">Reported utilization</th></tr></thead>
          <tbody>{availableUnderHalfUtilization.map((equipment) => <tr key={equipment.id}>
            <td><strong>{equipment.name}</strong><span>{equipment.id}</span></td>
            <td>{equipment.labId ? campusLabs.find((lab) => lab.id === equipment.labId)?.name : 'Not reported'}</td>
            <td>{equipment.capability}</td>
            <td><div className="insights-utilization"><div><i style={{ width: `${equipment.utilization}%` }} /></div><strong>{equipment.utilization}%</strong></div></td>
          </tr>)}</tbody>
        </table></div>
        <p className="insights-source-note">Availability and utilization values are reproduced from the shared prototype equipment records.</p>
      </Card>
    </section>

    <section className="insights-dashboard-section" aria-labelledby="strengths-title">
      <div className="insights-section-heading"><div><Badge variant="supporting">Inferred insight</Badge><p className="register-kicker">Capability synthesis</p><h2 id="strengths-title">Major campus strengths</h2></div><span>{campusFaculty.length} faculty · {campusLabs.length} labs reviewed</span></div>
      <div className="insights-strength-grid">{capabilityStrengths.map((strength) => <Card className="insights-strength-card" key={strength.title}><h3>{strength.title}</h3><p>{strength.evidence}</p></Card>)}</div>
    </section>

    <section className="insights-dashboard-section" aria-labelledby="reuse-title">
      <div className="insights-section-heading"><div><Badge variant="supporting">Inferred reuse opportunity</Badge><p className="register-kicker">Research connections</p><h2 id="reuse-title">Opportunities to reuse existing work</h2></div><span>Suggested connections</span></div>
      <div className="insights-reuse-grid">{reuseOpportunities.map((opportunity) => <Card className="insights-reuse-card" key={opportunity.title}>
        <h3>{opportunity.title}</h3><div><span>Existing project evidence</span><p>{projectTitles(opportunity.projectIds).join(' · ')}</p></div><p>{opportunity.rationale}</p>
      </Card>)}</div>
    </section>

    <section className="insights-dashboard-section insights-example-gaps" aria-labelledby="gaps-title">
      <div className="insights-section-heading"><div><Badge variant="warning">Example opportunity-derived prototype insight</Badge><p className="register-kicker">Example assessment limitations</p><h2 id="gaps-title">Potential gaps to validate</h2></div><span>Not campus-wide facts</span></div>
      <div className="insights-gap-grid">{mockAnalysis.gaps.map((gap) => <Card className="insights-gap-card" key={gap.id}><Badge variant="warning">Inferred gap</Badge><h3>{gap.title}</h3><p>{gap.explanation}</p></Card>)}</div>
      <p className="insights-source-note">These example gaps come from the prototype opportunity assessment. They indicate what is not represented in that example’s dataset and do not confirm that the capabilities are absent across campus.</p>
    </section>
  </div>
}
