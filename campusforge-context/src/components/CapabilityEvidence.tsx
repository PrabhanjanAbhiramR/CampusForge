import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react'
import type { EquipmentAsset, FacultyMember, Lab } from '../data/mockAnalysis'
import { campusLabs } from '../data/campusData'

type CapabilityEvidenceProps = {
  faculty: FacultyMember[]
  labs: Lab[]
  equipment: EquipmentAsset[]
}

export function CapabilityEvidence({ faculty, labs, equipment }: CapabilityEvidenceProps) {
  const labsById = new Map([
    ...campusLabs.map((lab) => [lab.id, lab.name] as const),
    ...labs.map((lab) => [lab.id, lab.name] as const),
  ])

  return (
    <>
      <div className="evidence-tag">Data evidence</div>
      <div className="summary-metrics">
        <div><strong>{faculty.length}</strong><span>Relevant faculty</span></div>
        <div><strong>{labs.length}</strong><span>Supporting labs</span></div>
        <div><strong>{equipment.length}</strong><span>High-value infrastructure assets</span></div>
      </div>

      <div className="subsection-heading"><h3>Faculty alignment</h3><span>Expertise represented in current data</span></div>
      <div className="faculty-list">
        {faculty.length > 0 ? faculty.map((person) => (
          <div className="faculty-row" key={person.id}>
            <div><strong>{person.name}</strong><span>{person.department}</span></div>
            <p>{person.expertise.join(' · ')}</p>
          </div>
        )) : <p className="section-empty-state">No directly relevant faculty records were found.</p>}
      </div>

      <div className="subsection-heading equipment-heading"><h3>Equipment capacity</h3><span>Current reported utilization</span></div>
      {equipment.length > 0 ? <div className="table-wrap">
        <table className="equipment-table">
          <thead><tr><th>Equipment</th><th>Lab</th><th>Capability</th><th>Utilization</th><th>Status</th></tr></thead>
          <tbody>
            {equipment.map((item) => (
              <tr key={item.id}>{(() => {
                const StatusIcon = item.status === 'Available' ? CheckCircle2 : item.status === 'Limited' ? AlertCircle : XCircle
                return <>
                <td>{item.name}</td><td>{labsById.get(item.labId) ?? 'Unassigned'}</td><td>{item.capability}</td>
                <td><div className="utilization"><div><span style={{ width: `${item.utilization}%` }} /></div><b>{item.utilization}%</b></div></td>
                <td><span className={`equipment-status equipment-status-${item.status.toLowerCase()}`}><StatusIcon size={13} /> {item.status}</span></td>
                </>
              })()}</tr>
            ))}
          </tbody>
        </table>
      </div> : <p className="section-empty-state">No directly relevant equipment records were found.</p>}
    </>
  )
}
