export type ResourceStatus = 'Available' | 'Limited'
export type ProjectStatus = 'Ongoing' | 'Completed' | 'Prototype'

export interface CampusFaculty {
  id: string
  name: string
  department: string
  expertise: string[]
}

export interface CampusLab {
  id: string
  name: string
  capabilities: string[]
}

export interface CampusEquipment {
  id: string
  name: string
  labId: string | null
  capability: string
  utilization: number
  status: ResourceStatus
}

export interface CampusProject {
  id: string
  title: string
  status: ProjectStatus
  fields: string[]
}

export const campusFaculty: CampusFaculty[] = [
  { id: 'F001', name: 'Dr. Ananya Rao', department: 'Information Science', expertise: ['Artificial Intelligence', 'Computer Vision', 'Edge AI'] },
  { id: 'F002', name: 'Dr. Arjun Kumar', department: 'Electronics and Communication', expertise: ['IoT', 'Embedded Systems', 'Sensor Networks'] },
  { id: 'F003', name: 'Dr. Meera Nair', department: 'Computer Science', expertise: ['Machine Learning', 'Data Mining', 'NLP'] },
  { id: 'F004', name: 'Dr. Rohan Iyer', department: 'Electrical and Electronics', expertise: ['Robotics', 'Control Systems', 'Power Electronics'] },
  { id: 'F005', name: 'Dr. Kavya Sharma', department: 'Information Science', expertise: ['Cloud Computing', 'Distributed Systems', 'Data Engineering'] },
  { id: 'F006', name: 'Dr. Vikram Desai', department: 'Computer Science', expertise: ['Cybersecurity', 'Federated Learning', 'Privacy'] },
  { id: 'F007', name: 'Dr. Neha Kulkarni', department: 'Electronics and Communication', expertise: ['Computer Vision', 'Signal Processing', 'Embedded AI'] },
  { id: 'F008', name: 'Dr. Sanjay Menon', department: 'Mechanical Engineering', expertise: ['Robotics', 'Mechatronics', 'Automation'] },
]

export const campusLabs: CampusLab[] = [
  { id: 'L001', name: 'AI & Intelligent Systems Lab', capabilities: ['GPU computing', 'model training', 'computer vision'] },
  { id: 'L002', name: 'IoT & Embedded Systems Lab', capabilities: ['Sensor networks', 'microcontrollers', 'edge devices'] },
  { id: 'L003', name: 'Data Analytics Lab', capabilities: ['Data processing', 'analytics', 'visualization'] },
  { id: 'L004', name: 'Robotics & Automation Lab', capabilities: ['Robot platforms', 'control systems', 'prototyping'] },
  { id: 'L005', name: 'Secure Computing Lab', capabilities: ['Security testing', 'privacy-preserving computation'] },
  { id: 'L006', name: 'Smart Energy Lab', capabilities: ['Power monitoring', 'smart metering', 'embedded control'] },
]

export const campusEquipment: CampusEquipment[] = [
  { id: 'E001', name: 'NVIDIA RTX GPU Workstation', labId: null, capability: 'Advanced AI and machine learning', utilization: 42, status: 'Available' },
  { id: 'E002', name: 'NVIDIA Jetson Nano Kit', labId: null, capability: 'Edge AI prototyping', utilization: 31, status: 'Available' },
  { id: 'E003', name: 'IoT Sensor Development Kit', labId: null, capability: 'IoT sensor research', utilization: 55, status: 'Available' },
  { id: 'E004', name: 'High-Resolution Camera System', labId: null, capability: 'Computer vision', utilization: 68, status: 'Available' },
  { id: 'E005', name: 'Autonomous Mobile Robot Platform', labId: null, capability: 'Robotics', utilization: 74, status: 'Limited' },
  { id: 'E006', name: 'Raspberry Pi Cluster', labId: null, capability: 'Edge computing', utilization: 37, status: 'Available' },
  { id: 'E007', name: 'Network Security Testbed', labId: null, capability: 'Cybersecurity', utilization: 63, status: 'Available' },
  { id: 'E008', name: 'Smart Metering Kit', labId: null, capability: 'Smart energy', utilization: 46, status: 'Available' },
  { id: 'E009', name: '3D Printer', labId: null, capability: 'Prototyping', utilization: 81, status: 'Limited' },
  { id: 'E010', name: 'Data Science Workstation', labId: null, capability: 'Data analytics', utilization: 58, status: 'Available' },
]

export const campusProjects: CampusProject[] = [
  { id: 'P001', title: 'Smart Crop Monitoring using IoT', status: 'Ongoing', fields: ['Smart Agriculture', 'IoT', 'Sensors', 'Edge Computing'] },
  { id: 'P002', title: 'Plant Disease Detection with Computer Vision', status: 'Completed', fields: ['Agricultural AI', 'Computer Vision', 'Deep Learning'] },
  { id: 'P003', title: 'Low-Power Edge AI for Visual Inspection', status: 'Ongoing', fields: ['Edge AI', 'Computer Vision', 'Embedded Systems'] },
  { id: 'P004', title: 'Autonomous Indoor Delivery Robot', status: 'Ongoing', fields: ['Robotics', 'SLAM', 'Computer Vision'] },
  { id: 'P005', title: 'Privacy-Preserving Student Analytics', status: 'Completed', fields: ['Federated Learning', 'Privacy', 'Machine Learning'] },
  { id: 'P006', title: 'Campus Energy Consumption Forecasting', status: 'Ongoing', fields: ['Smart Energy', 'Time Series', 'IoT', 'Energy Analytics'] },
  { id: 'P007', title: 'Research Resource Recommendation Engine', status: 'Prototype', fields: ['AI Recommendation Systems', 'Machine Learning', 'Data Mining', 'NLP'] },
  { id: 'P008', title: 'Scalable AI Experiment Tracking Platform', status: 'Prototype', fields: ['AI Infrastructure', 'Cloud Computing', 'Data Engineering', 'MLOps'] },
]
