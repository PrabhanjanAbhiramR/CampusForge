import { useState } from 'react'
import { campusEquipment, campusFaculty, campusLabs, campusProjects } from '../data/campusData'

const resourceTabs = ['Faculty', 'Labs', 'Equipment', 'Projects'] as const
type ResourceTab = typeof resourceTabs[number]

const resourceCounts: Record<ResourceTab, number> = {
  Faculty: campusFaculty.length,
  Labs: campusLabs.length,
  Equipment: campusEquipment.length,
  Projects: campusProjects.length,
}

function FacultyRegister() {
  return <div className="resource-rows">
    {campusFaculty.map((faculty) => <article className="resource-row" key={faculty.id}>
      <div className="resource-identity">
        <strong>{faculty.name}</strong>
        <span>{faculty.id}</span>
      </div>
      <span className="resource-department">{faculty.department}</span>
      <p>{faculty.expertise.join(' · ')}</p>
    </article>)}
  </div>
}

function LabRegister() {
  return <div className="resource-rows">
    {campusLabs.map((lab) => <article className="resource-row lab-resource-row" key={lab.id}>
      <div className="resource-identity">
        <strong>{lab.name}</strong>
        <span>{lab.id}</span>
      </div>
      <span className="resource-department">Campus research lab</span>
      <p>{lab.capabilities.join(' · ')}</p>
    </article>)}
  </div>
}

function EquipmentRegister() {
  return <div className="resource-table-wrap">
    <table className="resource-table">
      <thead><tr><th scope="col">Equipment</th><th scope="col">Lab</th><th scope="col">Capability</th><th scope="col">Utilization</th><th scope="col">Status</th></tr></thead>
      <tbody>{campusEquipment.map((equipment) => <tr key={equipment.id}>
        <td><strong>{equipment.name}</strong></td>
        <td>{equipment.labId ? campusLabs.find((lab) => lab.id === equipment.labId)?.name : 'Not reported'}</td>
        <td>{equipment.capability}</td>
        <td><div className="resource-utilization"><span>{equipment.utilization}%</span><i aria-hidden="true"><b style={{ width: `${equipment.utilization}%` }} /></i></div></td>
        <td><span className={`resource-status status-${equipment.status.toLowerCase()}`}>{equipment.status}</span></td>
      </tr>)}</tbody>
    </table>
  </div>
}

function ProjectRegister() {
  return <div className="resource-table-wrap">
    <table className="resource-table projects-table">
      <thead><tr><th scope="col">Project</th><th scope="col">Record</th><th scope="col">Research fields</th><th scope="col">Status</th></tr></thead>
      <tbody>{campusProjects.map((project) => <tr key={project.id}>
        <td><strong>{project.title}</strong></td>
        <td>{project.id}</td>
        <td>{project.fields.join(' · ')}</td>
        <td><span className={`resource-status status-${project.status.toLowerCase()}`}>{project.status}</span></td>
      </tr>)}</tbody>
    </table>
  </div>
}

export function CampusResourcesPage() {
  const [activeTab, setActiveTab] = useState<ResourceTab>('Faculty')

  return <div className="resources-page">
    <header className="page-header">
      <p className="eyebrow">Institutional capability register</p>
      <h1>Campus Resources</h1>
      <p className="page-intro">Review the people, laboratories, equipment, and active work that make up the campus research foundation.</p>
    </header>

    <section className="resources-register" aria-labelledby="resources-register-title">
      <div className="resources-register-heading">
        <div><p className="register-kicker">Prototype inventory</p><h2 id="resources-register-title">Research capacity</h2></div>
        <span>{Object.values(resourceCounts).reduce((total, count) => total + count, 0)} indexed resources</span>
      </div>

      <div className="resource-tabs" role="tablist" aria-label="Campus resource categories">
        {resourceTabs.map((tab) => <button type="button" role="tab" aria-selected={activeTab === tab} aria-controls="resource-panel" id={`resource-tab-${tab.toLowerCase()}`} className={activeTab === tab ? 'active' : ''} onClick={() => setActiveTab(tab)} key={tab}>
          <span>{tab}</span><b>{resourceCounts[tab].toString().padStart(2, '0')}</b>
        </button>)}
      </div>

      <div id="resource-panel" className="resource-panel" role="tabpanel" aria-labelledby={`resource-tab-${activeTab.toLowerCase()}`}>
        {activeTab === 'Faculty' && <FacultyRegister />}
        {activeTab === 'Labs' && <LabRegister />}
        {activeTab === 'Equipment' && <EquipmentRegister />}
        {activeTab === 'Projects' && <ProjectRegister />}
      </div>
      <p className="resource-note"><strong>Prototype note</strong>This register uses shared prototype campus data and is not connected to a live institutional inventory.</p>
    </section>
  </div>
}
