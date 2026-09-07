import type { CanonicalEvidence, EquipmentAsset, FacultyMember, Lab, ResearchProject, TrendEvidenceRecord } from '../../data/mockAnalysis'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/Tabs'

type EvidenceSectionProps<T> = { direct: T[]; supporting: T[]; renderItem: (item: T) => React.ReactNode }

function EvidenceSections<T extends { id: string }>({ direct, supporting, renderItem }: EvidenceSectionProps<T>) {
  return <div className="evidence-detail-groups">
    <section className={direct.length === 0 ? 'evidence-group-empty' : undefined}>
      <div className="evidence-group-heading"><Badge variant="direct">Direct evidence</Badge><span>{direct.length} record{direct.length === 1 ? '' : 's'}</span></div>
      {direct.length ? <div className="evidence-detail-list">{direct.map(renderItem)}</div> : <p className="assessment-empty">No direct evidence was returned for this domain.</p>}
    </section>
    <section className={supporting.length === 0 ? 'evidence-group-empty' : undefined}>
      <div className="evidence-group-heading"><Badge variant="supporting">Supporting evidence</Badge><span>{supporting.length} record{supporting.length === 1 ? '' : 's'}</span></div>
      {supporting.length ? <div className="evidence-detail-list">{supporting.map(renderItem)}</div> : <p className="assessment-empty">No supporting evidence was returned for this domain.</p>}
    </section>
  </div>
}

function FacultyItem(person: FacultyMember) {
  return <Card className="evidence-record" key={person.id}><h3>{person.name}</h3><span>{person.department}</span><p>{person.expertise.join(' · ')}</p></Card>
}

function LabItem(lab: Lab) {
  return <Card className="evidence-record" key={lab.id}><h3>{lab.name}</h3><p>{lab.capabilities.join(' · ')}</p></Card>
}

function EquipmentTable({ items, labs }: { items: EquipmentAsset[]; labs: Map<string, string> }) {
  return <div className="assessment-table-wrap"><table className="assessment-table">
    <thead><tr><th>Name</th><th>Lab</th><th>Capability</th><th>Utilization</th><th>Status</th></tr></thead>
    <tbody>{items.map((item) => <tr key={item.id}><td><strong>{item.name}</strong></td><td>{labs.get(item.labId) ?? item.labId}</td><td>{item.capability}</td><td>{item.utilization}%</td><td><Badge variant={item.status === 'Available' ? 'success' : item.status === 'Limited' ? 'warning' : 'outline'}>{item.status}</Badge></td></tr>)}</tbody>
  </table></div>
}

function ProjectTable({ items }: { items: ResearchProject[] }) {
  return <div className="assessment-table-wrap"><table className="assessment-table">
    <thead><tr><th>Title</th><th>Status</th><th>Fields</th></tr></thead>
    <tbody>{items.map((item) => <tr key={item.id}><td><strong>{item.title}</strong></td><td><Badge variant="outline">{item.status}</Badge></td><td>{item.fields.join(' · ')}</td></tr>)}</tbody>
  </table></div>
}

function TrendItem(item: TrendEvidenceRecord) {
  return <Card className="evidence-record" key={item.id}><h3>{item.researchArea}</h3><div className="trend-record-meta"><Badge variant="outline">{item.growth}</Badge>{typeof item.activityScore === 'number' && <span>Activity score {item.activityScore}</span>}</div></Card>
}

export function EvidenceDetails({ evidence }: { evidence: CanonicalEvidence }) {
  const labs = new Map([...evidence.labs.direct, ...evidence.labs.adjacent].flatMap((lab) => [[lab.id, lab.name], [lab.name, lab.name]]))
  return <section className="assessment-section" aria-labelledby="evidence-details-title">
    <div className="assessment-section-heading"><div><span>Returned records</span><h2 id="evidence-details-title">Evidence details</h2></div><p>Classification follows canonical evidence</p></div>
    <Tabs defaultValue="faculty" className="evidence-tabs">
      <div className="tabs-scroll"><TabsList aria-label="Evidence domains">
        <TabsTrigger value="faculty">Faculty</TabsTrigger><TabsTrigger value="labs">Labs</TabsTrigger>
        <TabsTrigger value="equipment">Equipment</TabsTrigger><TabsTrigger value="projects">Projects</TabsTrigger>
        <TabsTrigger value="trends">Research Trend</TabsTrigger>
      </TabsList></div>
      <TabsContent value="faculty"><EvidenceSections direct={evidence.faculty.direct} supporting={evidence.faculty.adjacent} renderItem={FacultyItem} /></TabsContent>
      <TabsContent value="labs"><EvidenceSections direct={evidence.labs.direct} supporting={evidence.labs.adjacent} renderItem={LabItem} /></TabsContent>
      <TabsContent value="equipment"><div className="evidence-detail-groups">
        <section className={evidence.equipment.direct.length === 0 ? 'evidence-group-empty' : undefined}><div className="evidence-group-heading"><Badge variant="direct">Direct evidence</Badge><span>{evidence.equipment.direct.length} records</span></div>{evidence.equipment.direct.length ? <EquipmentTable items={evidence.equipment.direct} labs={labs} /> : <p className="assessment-empty">No direct evidence was returned for this domain.</p>}</section>
        <section className={evidence.equipment.adjacent.length === 0 ? 'evidence-group-empty' : undefined}><div className="evidence-group-heading"><Badge variant="supporting">Supporting evidence</Badge><span>{evidence.equipment.adjacent.length} records</span></div>{evidence.equipment.adjacent.length ? <EquipmentTable items={evidence.equipment.adjacent} labs={labs} /> : <p className="assessment-empty">No supporting evidence was returned for this domain.</p>}</section>
      </div></TabsContent>
      <TabsContent value="projects"><div className="evidence-detail-groups">
        <section className={evidence.projects.direct.length === 0 ? 'evidence-group-empty' : undefined}><div className="evidence-group-heading"><Badge variant="direct">Direct evidence</Badge><span>{evidence.projects.direct.length} records</span></div>{evidence.projects.direct.length ? <ProjectTable items={evidence.projects.direct} /> : <p className="assessment-empty">No direct evidence was returned for this domain.</p>}</section>
        <section className={evidence.projects.adjacent.length === 0 ? 'evidence-group-empty' : undefined}><div className="evidence-group-heading"><Badge variant="supporting">Supporting evidence</Badge><span>{evidence.projects.adjacent.length} records</span></div>{evidence.projects.adjacent.length ? <ProjectTable items={evidence.projects.adjacent} /> : <p className="assessment-empty">No supporting evidence was returned for this domain.</p>}</section>
      </div></TabsContent>
      <TabsContent value="trends"><EvidenceSections direct={evidence.trends.direct} supporting={evidence.trends.adjacent} renderItem={TrendItem} /></TabsContent>
    </Tabs>
  </section>
}
