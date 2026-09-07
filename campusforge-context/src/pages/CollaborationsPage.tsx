import { campusFaculty, campusLabs } from '../data/campusData'

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

    <aside className="recommendation-disclaimer" aria-label="Recommendation status">
      <strong>Recommendation status</strong>
      <p>These are prototype recommendations inferred from the campus resource data. They are not existing or verified collaborations.</p>
    </aside>

    <section className="collaboration-register" aria-labelledby="collaboration-register-title">
      <div className="collaboration-register-heading">
        <div><p className="register-kicker">Recommended team formations</p><h2 id="collaboration-register-title">Cross-campus opportunities</h2></div>
        <span>{recommendations.length} recommendations</span>
      </div>

      <div className="recommendation-list">
        {recommendations.map((recommendation, index) => <article className="recommendation-card" key={recommendation.id}>
          <div className="recommendation-index">{String(index + 1).padStart(2, '0')}</div>
          <div className="recommendation-body">
            <span className="recommendation-label">Recommended collaboration</span>
            <h3>{recommendation.opportunity}</h3>
            <div className="recommendation-details">
              <div><span>Departments involved</span><p>{recommendation.departments.join(' · ')}</p></div>
              <div><span>Relevant faculty</span><p>{namesFor(recommendation.facultyIds).join(' · ')}</p></div>
              <div><span>Supporting labs</span><p>{labsFor(recommendation.labIds).join(' · ')}</p></div>
            </div>
            <div className="recommendation-rationale"><span>Rationale</span><p>{recommendation.rationale}</p></div>
          </div>
        </article>)}
      </div>
    </section>
  </div>
}
