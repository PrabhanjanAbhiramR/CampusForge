import { ArrowRight, Users } from 'lucide-react'
import type { Collaboration, FacultyMember } from '../../data/mockAnalysis'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'

export function CollaborationCard({ collaboration, faculty }: { collaboration: Collaboration; faculty: FacultyMember[] }) {
  const facultyById = new Map(faculty.map((person) => [person.id, person]))
  return <section className="assessment-section" aria-labelledby="collaboration-title">
    <div className="assessment-section-heading"><div><span>Suggested formation</span><h2 id="collaboration-title">Collaboration opportunity</h2></div></div>
    <Card className="assessment-collaboration-card">
      {collaboration.departments.length > 0 && <div className="department-badges">{collaboration.departments.map((department) => <Badge variant="outline" key={department}>{department}</Badge>)}</div>}
      <p className="collaboration-summary">{collaboration.summary}</p>
      <div className="suggested-team-heading"><Users size={17} /><h3>Suggested team</h3></div>
      {collaboration.members.length ? <div className="suggested-team-list">{collaboration.members.map((member) => {
        const person = facultyById.get(member.facultyId)
        return <div key={member.facultyId}><strong>{person?.name ?? 'Faculty member'}</strong><span>{member.contribution}</span></div>
      })}</div> : <p className="assessment-empty">No directly relevant faculty members are available for a suggested team.</p>}
      {collaboration.capabilityFlow.length > 0 && <div className="capability-flow" aria-label="Capability flow">{collaboration.capabilityFlow.map((step, index) => <span key={step}>{index > 0 && <ArrowRight size={14} aria-hidden="true" />}<b>{step}</b></span>)}</div>}
    </Card>
  </section>
}
