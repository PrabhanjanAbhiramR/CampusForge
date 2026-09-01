import { CheckCircle2 } from 'lucide-react'
import type { EquipmentAsset, FacultyMember, Lab } from '../data/mockAnalysis'

type CapabilityEvidenceProps = {
  faculty: FacultyMember[]
  labs: Lab[]
  equipment: EquipmentAsset[]
}

export function CapabilityEvidence({ faculty, labs, equipment }: CapabilityEvidenceProps) {
  const labsById = new Map(labs.map((lab) => [lab.id, lab.name]))

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
        {faculty.map((person) => (
          <div className="faculty-row" key={person.id}>
            <div><strong>{person.name}</strong><span>{person.department}</span></div>
            <p>{person.expertise.join(' · ')}</p>
          </div>
        ))}
      </div>

      <div className="subsection-heading equipment-heading"><h3>Equipment capacity</h3><span>Current reported utilization</span></div>
      <div className="table-wrap">
        <table className="equipment-table">
          <thead><tr><th>Equipment</th><th>Lab</th><th>Capability</th><th>Utilization</th><th>Status</th></tr></thead>
          <tbody>
            {equipment.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td><td>{labsById.get(item.labId) ?? 'Unassigned'}</td><td>{item.capability}</td>
                <td><div className="utilization"><div><span style={{ width: `${item.utilization}%` }} /></div><b>{item.utilization}%</b></div></td>
                <td><span className="available-status"><CheckCircle2 size={13} /> {item.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
