export type EvidenceKind = 'data' | 'inferred-gap' | 'recommendation'

export interface Opportunity {
  title: string
  verdict: string
  rationale: string
}

export interface Readiness {
  score: number
  maximum: number
  label: string
  disclaimer: string
}

export interface ResearchTrend {
  momentum: 'Low' | 'Medium' | 'Medium-High' | 'High'
  summary: string
}

export interface FacultyMember {
  id: string
  name: string
  department: string
  expertise: string[]
}

export interface Lab {
  id: string
  name: string
  capabilities: string[]
}

export interface EquipmentAsset {
  id: string
  name: string
  labId: string
  capability: string
  utilization: number
  status: 'Available' | 'Limited' | 'Unavailable'
}

export interface ResearchProject {
  id: string
  title: string
  status: 'Ongoing' | 'Completed'
  fields: string[]
}

export interface CapabilityGap {
  id: string
  title: string
  explanation: string
  evidenceKind: 'inferred-gap'
}

export interface CollaborationMember {
  facultyId: string
  contribution: string
}

export interface Collaboration {
  departments: string[]
  summary: string
  members: CollaborationMember[]
  capabilityFlow: string[]
}

export interface Recommendation {
  verdict: string
  summary: string
  evidenceKind: 'recommendation'
}

export interface EvidenceDefinition {
  kind: EvidenceKind
  label: string
  description: string
}

export interface CampusForgeAnalysis {
  opportunity: Opportunity
  readiness: Readiness
  researchTrend: ResearchTrend
  faculty: FacultyMember[]
  labs: Lab[]
  equipment: EquipmentAsset[]
  projects: ResearchProject[]
  gaps: CapabilityGap[]
  collaboration: Collaboration
  recommendation: Recommendation
  evidence: EvidenceDefinition[]
  researchConnection: string
}

export const mockAnalysis: CampusForgeAnalysis = {
  opportunity: {
    title: 'Edge AI for Smart Agriculture',
    verdict: 'High Research Potential',
    rationale: 'The campus already has overlapping capabilities in Edge AI, IoT, computer vision, and agricultural AI. Their intersection creates a credible foundation for smart agriculture prototypes without requiring a new technical stack from the outset.',
  },
  readiness: {
    score: 87,
    maximum: 100,
    label: 'Prototype readiness',
    disclaimer: 'Prototype decision-support indicator, not a guarantee of research outcomes.',
  },
  researchTrend: {
    momentum: 'High',
    summary: 'Strong alignment across active projects and available technical capacity.',
  },
  faculty: [
    { id: 'faculty-rao', name: 'Dr. Ananya Rao', department: 'Information Science', expertise: ['Artificial Intelligence', 'Computer Vision', 'Edge AI'] },
    { id: 'faculty-kulkarni', name: 'Dr. Neha Kulkarni', department: 'Electronics and Communication', expertise: ['Computer Vision', 'Signal Processing', 'Embedded AI'] },
    { id: 'faculty-kumar', name: 'Dr. Arjun Kumar', department: 'Electronics and Communication', expertise: ['IoT', 'Embedded Systems', 'Sensor Networks'] },
  ],
  labs: [
    { id: 'lab-iot', name: 'IoT & Embedded Systems Lab', capabilities: ['IoT prototyping', 'Embedded systems', 'Sensor networks'] },
    { id: 'lab-ai', name: 'AI & Intelligent Systems Lab', capabilities: ['AI training', 'Computer vision', 'Image acquisition'] },
    { id: 'lab-agri', name: 'Agricultural AI Research Group', capabilities: ['Crop monitoring', 'Plant disease detection'] },
  ],
  equipment: [
    { id: 'eq-jetson', name: 'NVIDIA Jetson Nano Kit', labId: 'lab-iot', capability: 'Edge AI inference', utilization: 31, status: 'Available' },
    { id: 'eq-pi', name: 'Raspberry Pi Cluster', labId: 'lab-iot', capability: 'Distributed edge prototyping', utilization: 37, status: 'Available' },
    { id: 'eq-rtx', name: 'NVIDIA RTX GPU Workstation', labId: 'lab-ai', capability: 'AI training / Computer Vision', utilization: 42, status: 'Available' },
    { id: 'eq-camera', name: 'High-Resolution Camera System', labId: 'lab-ai', capability: 'Image acquisition', utilization: 68, status: 'Available' },
  ],
  projects: [
    { id: 'project-crop-iot', title: 'Smart Crop Monitoring using IoT', status: 'Ongoing', fields: ['IoT', 'Sensors', 'Edge Computing'] },
    { id: 'project-edge-vision', title: 'Low-Power Edge AI for Visual Inspection', status: 'Ongoing', fields: ['Edge AI', 'Computer Vision', 'Embedded Systems'] },
    { id: 'project-disease', title: 'Plant Disease Detection with Computer Vision', status: 'Completed', fields: ['Computer Vision', 'Deep Learning'] },
  ],
  gaps: [
    { id: 'gap-agronomy', title: 'Agricultural domain expertise', explanation: 'No dedicated agronomy/crop-science expertise represented in current data.', evidenceKind: 'inferred-gap' },
    { id: 'gap-field', title: 'Field deployment infrastructure', explanation: 'Current equipment is primarily suitable for prototyping rather than rugged field deployment.', evidenceKind: 'inferred-gap' },
    { id: 'gap-testing', title: 'Agricultural testing environment', explanation: 'No dedicated agricultural test environment represented in current data.', evidenceKind: 'inferred-gap' },
  ],
  collaboration: {
    departments: ['Information Science', 'Electronics and Communication'],
    summary: 'A focused cross-department team would connect model development, sensing systems, and deployable embedded intelligence.',
    members: [
      { facultyId: 'faculty-rao', contribution: 'Edge AI + Computer Vision' },
      { facultyId: 'faculty-kumar', contribution: 'IoT + Sensors' },
      { facultyId: 'faculty-kulkarni', contribution: 'Embedded AI + Vision' },
    ],
    capabilityFlow: ['Sense', 'Interpret at the edge', 'Validate visually'],
  },
  recommendation: {
    verdict: 'High Research Potential',
    summary: 'The campus already has much of the technical foundation required to pursue this area. The strongest path is to combine existing Edge AI, IoT, computer vision and agricultural AI work while addressing domain-expertise and field-testing gaps through collaboration.',
    evidenceKind: 'recommendation',
  },
  evidence: [
    { kind: 'data', label: 'Data evidence', description: 'Facts directly supported by campus datasets.' },
    { kind: 'inferred-gap', label: 'Inferred gap', description: 'Capabilities not represented in available campus data.' },
    { kind: 'recommendation', label: 'Recommendation', description: 'Suggested actions based on analysis.' },
  ],
  researchConnection: 'These projects form a connected pathway from field sensing to edge inference and visual crop analysis.',
}
