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

    <div className="insight-legend" aria-label="Evidence classification">
      <span><i className="insight-data-key" /><b>Dataset evidence</b>Directly represented in shared prototype records.</span>
      <span><i className="insight-inferred-key" /><b>Inferred insight</b>Interpretation derived from those records.</span>
    </div>

    <section className="insight-section" aria-labelledby="available-equipment-title">
      <div className="insight-section-number">01</div>
      <div className="insight-section-content">
        <span className="insight-kind data-kind">Dataset evidence</span>
        <div className="insight-title-row"><div><p className="register-kicker">Reported capacity</p><h2 id="available-equipment-title">Available equipment below 50% utilization</h2></div><span>Prototype inventory</span></div>
        <div className="insight-equipment-table-wrap"><table className="insight-equipment-table">
          <thead><tr><th scope="col">Equipment</th><th scope="col">Supporting lab</th><th scope="col">Capability</th><th scope="col">Reported utilization</th></tr></thead>
          <tbody>{availableUnderHalfUtilization.map((equipment) => <tr key={equipment.id}>
            <td><strong>{equipment.name}</strong></td><td>{equipment.labId ? campusLabs.find((lab) => lab.id === equipment.labId)?.name : 'Not reported'}</td><td>{equipment.capability}</td>
            <td><div className="insight-utilization"><b>{equipment.utilization}%</b><span aria-hidden="true"><i style={{ width: `${equipment.utilization}%` }} /></span></div></td>
          </tr>)}</tbody>
        </table></div>
        <p className="insight-source-note">Availability and utilization values are reproduced from the shared prototype equipment records.</p>
      </div>
    </section>

    <section className="insight-section" aria-labelledby="strengths-title">
      <div className="insight-section-number">02</div>
      <div className="insight-section-content">
        <span className="insight-kind inferred-kind">Inferred insight</span>
        <div className="insight-title-row"><div><p className="register-kicker">Capability synthesis</p><h2 id="strengths-title">Major campus strengths</h2></div><span>{campusFaculty.length} faculty · {campusLabs.length} labs reviewed</span></div>
        <div className="strength-list">{capabilityStrengths.map((strength) => <article key={strength.title}><strong>{strength.title}</strong><p>{strength.evidence}</p></article>)}</div>
      </div>
    </section>

    <section className="insight-section" aria-labelledby="reuse-title">
      <div className="insight-section-number">03</div>
      <div className="insight-section-content">
        <span className="insight-kind inferred-kind">Inferred reuse opportunity</span>
        <div className="insight-title-row"><div><p className="register-kicker">Research connections</p><h2 id="reuse-title">Opportunities to reuse existing work</h2></div><span>Suggested connections</span></div>
        <div className="reuse-list">{reuseOpportunities.map((opportunity) => <article key={opportunity.title}>
          <h3>{opportunity.title}</h3><div><span>Existing project evidence</span><p>{projectTitles(opportunity.projectIds).join(' · ')}</p></div><p>{opportunity.rationale}</p>
        </article>)}</div>
      </div>
    </section>

    <section className="insight-section gaps-insight-section" aria-labelledby="gaps-title">
      <div className="insight-section-number">04</div>
      <div className="insight-section-content">
        <span className="insight-kind gap-kind">Inferred capability gap</span>
        <div className="insight-title-row"><div><p className="register-kicker">Capabilities not represented</p><h2 id="gaps-title">Potential gaps to validate</h2></div><span>Not absence verified</span></div>
        <div className="insight-gap-list">{mockAnalysis.gaps.map((gap) => <article key={gap.id}><strong>{gap.title}</strong><p>{gap.explanation}</p></article>)}</div>
        <p className="insight-source-note">These gaps indicate what is not represented in the prototype dataset. They do not confirm that the capabilities are absent on campus.</p>
      </div>
    </section>
  </div>
}
