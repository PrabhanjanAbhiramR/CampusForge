import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { researchTrendOpportunities } from '../data/researchTrends'

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
                    {opportunity.discoverQuery ? (
                      <Link className="evaluate-link" to="/" aria-label={`Evaluate ${opportunity.researchArea} in Discover`}>
                        Evaluate <ArrowRight size={13} strokeWidth={1.7} />
                      </Link>
                    ) : <span className="no-action" aria-hidden="true">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="trend-disclaimer">
          <strong>Prototype note</strong>
          These activity scores and growth indicators are synthetic prototype trend signals, not verified publication statistics.
        </p>
      </section>
    </div>
  )
}
