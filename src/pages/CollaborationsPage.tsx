import { campusFaculty, campusLabs } from '../data/campusData'
import { Badge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'

interface CollaborationRecommendation {
  id: string
  opportunity: string
  departments: string[]
  facultyIds: string[]
  labIds: string[]
  rationale: string
}

const recommendations: CollaborationRecommendation[] = [
  {
    id: 'edge-agriculture',
    opportunity: 'Edge AI for resilient smart agriculture',
    departments: ['Information Science', 'Electronics and Communication'],
    facultyIds: ['F001', 'F007', 'F002'],
    labIds: ['L001', 'L002'],
    rationale: 'Connect computer vision and embedded AI expertise with sensing infrastructure and the existing agricultural research group to develop field-ready crop monitoring prototypes.',
  },
  {
    id: 'privacy-edge',
    opportunity: 'Privacy-preserving distributed edge intelligence',
    departments: ['Computer Science', 'Information Science', 'Electronics and Communication'],
    facultyIds: ['F006', 'F001', 'F002'],
    labIds: ['L005', 'L001', 'L002'],
    rationale: 'Combine federated learning, edge inference, and sensor-network capabilities to study models that learn across distributed campus devices without centralizing sensitive data.',
  },
  {
    id: 'autonomous-inspection',
    opportunity: 'Autonomous visual inspection systems',
    departments: ['Mechanical Engineering', 'Electronics and Communication', 'Information Science'],
    facultyIds: ['F008', 'F007', 'F001'],
    labIds: ['L004', 'L001'],
    rationale: 'Pair mobile robotics and motion planning with machine perception and computer vision to create an autonomous platform for repeatable facility or laboratory inspection.',
  },
  {
    id: 'field-robotics',
    opportunity: 'Low-power robotics for environmental field sensing',
    departments: ['Mechanical Engineering', 'Electronics and Communication'],
    facultyIds: ['F008', 'F002', 'F007'],
    labIds: ['L004', 'L002'],
    rationale: 'Link autonomous navigation, low-power sensing, and field analytics to explore mobile data collection in agricultural or environmental settings.',
  },
]

function namesFor(ids: string[]) {
  return ids.map((id) => campusFaculty.find((faculty) => faculty.id === id)?.name).filter((name): name is string => Boolean(name))
}

function labsFor(ids: string[]) {
  return ids.map((id) => campusLabs.find((lab) => lab.id === id)?.name).filter((name): name is string => Boolean(name))
}

export function CollaborationsPage() {
  return <div className="collaborations-page">
    <header className="page-header">
      <p className="eyebrow">Interdisciplinary opportunity mapping</p>
      <h1>Collaboration Recommendations</h1>
      <p className="page-intro">Explore research teams that could connect complementary expertise and infrastructure across campus.</p>
    </header>

    <aside className="collaborations-disclaimer" aria-label="Recommendation status">
      <Badge variant="warning">Prototype recommendations</Badge>
      <p>These are prototype recommendations inferred from the campus resource data. They are not existing or verified collaborations.</p>
    </aside>

    <section className="collaborations-dashboard" aria-labelledby="collaboration-register-title">
      <div className="collaborations-dashboard-heading">
        <div><p className="register-kicker">Recommended team formations</p><h2 id="collaboration-register-title">Cross-campus opportunities</h2></div>
        <span>{recommendations.length} recommendations</span>
      </div>

      <div className="collaboration-card-grid">
        {recommendations.map((recommendation, index) => <Card className="collaboration-dashboard-card" key={recommendation.id}>
          <div className="collaboration-card-heading">
            <div><span>{String(index + 1).padStart(2, '0')}</span><Badge variant="direct">Prototype recommendation</Badge></div>
            <h3>{recommendation.opportunity}</h3>
          </div>
          <div className="collaboration-card-section">
            <span>Departments</span>
            <div className="collaboration-tag-list">{recommendation.departments.map((department) => <Badge variant="supporting" key={department}>{department}</Badge>)}</div>
          </div>
          <div className="collaboration-card-details">
            <section><span>Faculty involved</span><ul>{namesFor(recommendation.facultyIds).map((name) => <li key={name}>{name}</li>)}</ul></section>
            <section><span>Supporting labs</span><ul>{labsFor(recommendation.labIds).map((lab) => <li key={lab}>{lab}</li>)}</ul></section>
          </div>
          <div className="collaboration-card-rationale"><span>Rationale</span><p>{recommendation.rationale}</p></div>
        </Card>)}
      </div>
    </section>
  </div>
}
