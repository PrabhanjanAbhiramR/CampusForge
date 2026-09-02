import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { researchTrendOpportunities } from '../data/researchTrends'

const momentumClassifications = [
  { label: 'High', range: '76–100', description: 'Strong prototype research activity signal.' },
  { label: 'Medium-High', range: '70–75', description: 'Promising activity with meaningful momentum.' },
  { label: 'Medium', range: '60–69', description: 'Developing research activity with moderate momentum.' },
  { label: 'Low', range: 'Below 60', description: 'Limited research activity signal.' },
]

function discoverQuestion(researchArea: string) {
  return `Can our campus pursue ${researchArea}?`
}

export function ResearchTrendsPage() {
  return (
    <div className="trends-page">
      <header className="page-header">
        <p className="eyebrow">Prototype trend signals</p>
        <h1>Research Trends</h1>
        <p className="page-intro">
          Track emerging research areas and compare their momentum against campus capability.
        </p>
      </header>

      <section className="trends-register" aria-labelledby="trend-register-title">
        <div className="trends-register-heading">
          <div>
            <p className="register-kicker">Emerging opportunity register</p>
            <h2 id="trend-register-title">Research activity signals</h2>
          </div>
          <span>{researchTrendOpportunities.length} prototype areas</span>
        </div>

        <div className="trends-table-wrap">
          <table className="trends-table">
            <thead>
              <tr>
                <th scope="col">Research area</th>
                <th scope="col">Research activity</th>
                <th scope="col">Growth</th>
                <th scope="col">Key technologies</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {researchTrendOpportunities.map((opportunity) => (
                <tr key={opportunity.id}>
                  <td><strong>{opportunity.researchArea}</strong></td>
                  <td>
                    <div className="activity-signal" aria-label={`Activity score ${opportunity.activityScore} out of 100`}>
                      <span>{opportunity.activityScore}</span>
                      <div aria-hidden="true"><i style={{ width: `${opportunity.activityScore}%` }} /></div>
                    </div>
                  </td>
                  <td><span className={`growth-signal growth-${opportunity.growth.toLowerCase()}`}>{opportunity.growth}</span></td>
                  <td><span className="technology-list">{opportunity.keyTechnologies.join(' · ')}</span></td>
                  <td>
                    <Link className="evaluate-link"
                      to={`/?query=${encodeURIComponent(discoverQuestion(opportunity.researchArea))}`}
                      aria-label={`Evaluate ${opportunity.researchArea} in Discover`}>
                      Evaluate <ArrowRight size={13} strokeWidth={1.7} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section className="momentum-classification" aria-labelledby="momentum-classification-title">
          <div className="momentum-classification-heading">
            <p className="register-kicker">Classification guide</p>
            <h2 id="momentum-classification-title">How momentum is classified</h2>
          </div>
          <div className="momentum-bands">
            {momentumClassifications.map((classification) => (
              <article key={classification.label}>
                <div><strong>{classification.label}</strong><span>{classification.range}</span></div>
                <p>{classification.description}</p>
              </article>
            ))}
          </div>
          <p className="momentum-clarification">
            Growth classifications are derived from the synthetic Research Activity Score for this prototype. They do not represent verified publication growth.
          </p>
        </section>

        <p className="trend-disclaimer">
          <strong>Prototype note</strong>
          These activity scores and growth indicators are synthetic prototype trend signals, not verified publication statistics.
        </p>
      </section>
    </div>
  )
}
