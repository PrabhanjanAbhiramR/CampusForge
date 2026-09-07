import { ArrowDown, Link2, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import type { CampusForgeAnalysis, EvidenceKind } from '../data/mockAnalysis'
import { CapabilityEvidence } from './CapabilityEvidence'

function BriefingSection({ number, title, children, className = '' }: {
  number: string
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`briefing-section ${className}`}>
      <div className="section-index">{number}</div>
      <div className="section-content"><h2>{title}</h2>{children}</div>
    </section>
  )
}

const evidenceClassNames: Record<EvidenceKind, string> = {
  data: 'evidence-key',
  'inferred-gap': 'gap-key',
  recommendation: 'recommendation-key',
}

export function ResearchBriefing({ analysis }: { analysis: CampusForgeAnalysis }) {
  const { opportunity, readiness, researchTrend, faculty, labs, equipment, projects, gaps, collaboration, recommendation, evidence } = analysis
  const facultyById = new Map(faculty.map((person) => [person.id, person]))
  const readinessPercent = Math.min(100, Math.round((readiness.score / readiness.maximum) * 100))

  return (
    <article className="research-briefing" aria-labelledby="briefing-title">
      <header className="briefing-cover">
        <div className="briefing-meta"><span>Opportunity assessment</span><span>Prototype decision brief</span></div>
        <div className="briefing-title-row">
          <div><p className="report-label">Opportunity</p><h1 id="briefing-title">{opportunity.title}</h1></div>
          <div className="verdict-block"><p>Verdict</p><strong>{opportunity.verdict}</strong></div>
        </div>
        <div className="signal-grid">
          <div className="readiness-signal">
            <span>{readiness.label}</span>
            <strong>{readiness.score} <small>/ {readiness.maximum}</small></strong>
            <div className="readiness-track"><span style={{ width: `${readinessPercent}%` }} /></div>
            <p>{readiness.disclaimer}</p>
          </div>
          <div className="momentum-signal">
            <span>Research momentum</span><strong>{researchTrend.momentum}</strong><p>{researchTrend.summary}</p>
          </div>
        </div>
      </header>

      <div className="evidence-legend" aria-label="Information classification legend">
        {evidence.map((item) => (
          <span key={item.kind}><i className={evidenceClassNames[item.kind]} /><b>{item.label}</b>{item.description}</span>
        ))}
      </div>

      <BriefingSection number="01" title="Why this opportunity">
        <p className="section-lead">{opportunity.rationale}</p>
      </BriefingSection>

      <BriefingSection number="02" title="Capability evidence">
        <CapabilityEvidence faculty={faculty} labs={labs} equipment={equipment} />
      </BriefingSection>

      <BriefingSection number="03" title="Existing research">
        {projects.length > 0 ? <><div className="research-connection">
          <div className="connection-line" aria-hidden="true" />
          {projects.map((project, index) => (
            <div className="project-row" key={project.id}>
              <span className="connection-node">{index + 1}</span>
              <div className="project-copy"><strong>{project.title}</strong><span>{project.fields.join(' · ')}</span></div>
              <span className={`project-status ${project.status.toLowerCase()}`}>{project.status}</span>
            </div>
          ))}
        </div>
        <div className="connection-insight"><Link2 size={16} /><p>{analysis.researchConnection}</p></div></>
          : <p className="section-empty-state">No directly relevant existing projects were found.</p>}
      </BriefingSection>

      <BriefingSection number="04" title="Capability gaps" className="gaps-section">
        <div className="gap-tag">Inferred gaps · not dataset facts</div>
        {gaps.length > 0 ? <div className="gap-list">
          {gaps.map((gap) => <div className="gap-row" key={gap.id}><strong>{gap.title}</strong><p>{gap.explanation}</p></div>)}
        </div> : <p className="section-empty-state">No capability gaps were identified in the returned analysis.</p>}
      </BriefingSection>

      <BriefingSection number="05" title="Collaboration opportunity" className="collaboration-section">
        {collaboration.departments.length > 0 ? <><div className="collaboration-lockup">
          {collaboration.departments.map((department, index) => (
            <span className="department-pair" key={department}>
              {index > 0 && <b aria-hidden="true">×</b>}<span>{department}</span>
            </span>
          ))}
        </div>
        <p className="collaboration-intro">{collaboration.summary}</p></>
          : <p className="section-empty-state">No directly supported cross-department collaboration was identified.</p>}
        <div className="team-heading"><Users size={16} /><h3>Suggested team</h3></div>
        {collaboration.members.length > 0 ? <div className="team-list">
          {collaboration.members.map((member) => {
            const person = facultyById.get(member.facultyId)
            return <div key={member.facultyId}><strong>{person?.name ?? 'Faculty member'}</strong><span>{member.contribution}</span></div>
          })}
        </div> : <p className="section-empty-state team-empty-state">No directly relevant faculty members are available for a suggested team.</p>}
        {collaboration.capabilityFlow.length > 0 && <div className="complement-flow">
          {collaboration.capabilityFlow.map((step, index) => (
            <span className="flow-step" key={step}>{index > 0 && <ArrowDown size={14} />}<span>{step}</span></span>
          ))}
        </div>}
      </BriefingSection>

      <section className="final-recommendation">
        <div className="recommendation-tag">Recommendation · analytical guidance</div>
        <p className="report-label">Final recommendation</p>
        <h2>{recommendation.verdict}</h2><p>{recommendation.summary}</p>
      </section>
    </article>
  )
}
