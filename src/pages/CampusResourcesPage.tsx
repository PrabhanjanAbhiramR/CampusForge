import { Badge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/Tabs'
import { campusEquipment, campusFaculty, campusLabs, campusProjects } from '../data/campusData'

const resourceTabs = [
  { value: 'faculty', label: 'Faculty', count: campusFaculty.length },
  { value: 'labs', label: 'Labs', count: campusLabs.length },
  { value: 'equipment', label: 'Equipment', count: campusEquipment.length },
  { value: 'projects', label: 'Projects', count: campusProjects.length },
] as const

function FacultyRegister() {
  return <div className="resource-card-grid">
    {campusFaculty.map((faculty) => <Card className="resource-profile-card" key={faculty.id}>
      <div><span>{faculty.id}</span><h3>{faculty.name}</h3><p>{faculty.department}</p></div>
      <section aria-label={`Expertise for ${faculty.name}`}><span>Expertise</span><div>{faculty.expertise.map((item) => <Badge variant="supporting" key={item}>{item}</Badge>)}</div></section>
    </Card>)}
  </div>
}

function LabRegister() {
  return <div className="resource-card-grid">
    {campusLabs.map((lab) => <Card className="resource-profile-card resource-lab-card" key={lab.id}>
      <div><span>{lab.id}</span><h3>{lab.name}</h3></div>
      <section aria-label={`Capabilities for ${lab.name}`}><span>Capabilities</span><div>{lab.capabilities.map((item) => <Badge variant="supporting" key={item}>{item}</Badge>)}</div></section>
    </Card>)}
  </div>
}

function EquipmentRegister() {
  return <div className="resource-dashboard-table-wrap">
    <table className="resource-dashboard-table">
      <thead><tr><th scope="col">Equipment</th><th scope="col">Associated lab</th><th scope="col">Capability</th><th scope="col">Utilization</th><th scope="col">Status</th></tr></thead>
      <tbody>{campusEquipment.map((equipment) => {
        const lab = equipment.labId ? campusLabs.find((item) => item.id === equipment.labId) : undefined
        return <tr key={equipment.id}>
          <td><strong>{equipment.name}</strong><span>{equipment.id}</span></td>
          <td>{lab?.name ?? 'Not reported'}</td>
          <td>{equipment.capability}</td>
          <td><div className="resource-dashboard-utilization"><div><i style={{ width: `${equipment.utilization}%` }} /></div><strong>{equipment.utilization}%</strong></div></td>
          <td><Badge variant={equipment.status === 'Available' ? 'success' : 'warning'}>{equipment.status}</Badge></td>
        </tr>
      })}</tbody>
    </table>
  </div>
}

function ProjectRegister() {
  return <div className="resource-dashboard-table-wrap">
    <table className="resource-dashboard-table resource-project-table">
      <thead><tr><th scope="col">Project</th><th scope="col">Research fields</th><th scope="col">Status</th></tr></thead>
      <tbody>{campusProjects.map((project) => <tr key={project.id}>
        <td><strong>{project.title}</strong><span>{project.id}</span></td>
        <td><div className="resource-field-list">{project.fields.map((field) => <Badge variant="supporting" key={field}>{field}</Badge>)}</div></td>
        <td><Badge variant={project.status === 'Ongoing' ? 'direct' : project.status === 'Completed' ? 'success' : 'outline'}>{project.status}</Badge></td>
      </tr>)}</tbody>
    </table>
  </div>
}

export function CampusResourcesPage() {
  const totalResources = resourceTabs.reduce((total, tab) => total + tab.count, 0)

  return <div className="resources-page">
    <header className="page-header">
      <p className="eyebrow">Institutional capability register</p>
      <h1>Campus Resources</h1>
      <p className="page-intro">Review the people, laboratories, equipment, and active work that make up the campus research foundation.</p>
    </header>

    <Card className="resources-dashboard">
      <div className="resources-dashboard-heading">
        <div><p className="register-kicker">Prototype inventory</p><h2>Research capacity</h2></div>
        <span>{totalResources} indexed resources</span>
      </div>

      <Tabs defaultValue="faculty" className="resources-dashboard-tabs">
        <div className="tabs-scroll"><TabsList aria-label="Campus resource categories">
          {resourceTabs.map((tab) => <TabsTrigger value={tab.value} key={tab.value}>{tab.label}<Badge variant="outline">{tab.count}</Badge></TabsTrigger>)}
        </TabsList></div>
        <TabsContent value="faculty"><FacultyRegister /></TabsContent>
        <TabsContent value="labs"><LabRegister /></TabsContent>
        <TabsContent value="equipment"><EquipmentRegister /></TabsContent>
        <TabsContent value="projects"><ProjectRegister /></TabsContent>
      </Tabs>

      <p className="resources-dashboard-note"><strong>Prototype inventory</strong><span>This register uses shared prototype campus data and is not connected to a live institutional inventory.</span></p>
    </Card>
  </div>
}
