export type ResearchGrowth = 'High' | 'Medium-High' | 'Medium' | 'Low'

export interface ResearchTrendOpportunity {
  id: string
  researchArea: string
  activityScore: number
  growth: ResearchGrowth
  keyTechnologies: string[]
  discoverQuery?: string
}

export const researchTrendOpportunities: ResearchTrendOpportunity[] = [
  {
    id: 'edge-ai-smart-agriculture',
    researchArea: 'Edge AI for Smart Agriculture',
    activityScore: 86,
    growth: 'High',
    keyTechnologies: ['Edge AI', 'Smart Agriculture', 'IoT', 'Computer Vision', 'Precision Agriculture'],
    discoverQuery: 'Can our campus pursue Edge AI for smart agriculture?',
  },
  {
    id: 'autonomous-robotics',
    researchArea: 'Autonomous Robotics',
    activityScore: 78,
    growth: 'High',
    keyTechnologies: ['Robotics', 'Autonomous Systems', 'Machine Perception'],
  },
  {
    id: 'healthcare-ai',
    researchArea: 'Healthcare AI',
    activityScore: 82,
    growth: 'High',
    keyTechnologies: ['Clinical AI', 'Medical Imaging', 'Predictive Analytics'],
  },
  {
    id: 'federated-learning',
    researchArea: 'Federated Learning',
    activityScore: 74,
    growth: 'Medium-High',
    keyTechnologies: ['Distributed Learning', 'Privacy-Preserving AI'],
  },
  {
    id: 'smart-energy-analytics',
    researchArea: 'Smart Energy Analytics',
    activityScore: 71,
    growth: 'Medium-High',
    keyTechnologies: ['Energy Analytics', 'Forecasting', 'Smart Grids'],
  },
  {
    id: 'sustainable-manufacturing-ai',
    researchArea: 'AI for Sustainable Manufacturing',
    activityScore: 76,
    growth: 'High',
    keyTechnologies: ['Industrial AI', 'Process Optimization', 'Sustainable Systems'],
  },
  {
    id: 'campus-digital-twin',
    researchArea: 'Campus Digital Twin',
    activityScore: 69,
    growth: 'Medium',
    keyTechnologies: ['Digital Twins', 'IoT', 'Simulation'],
  },
  {
    id: 'multimodal-ai-education',
    researchArea: 'Multimodal AI for Education',
    activityScore: 73,
    growth: 'Medium-High',
    keyTechnologies: ['Multimodal AI', 'Learning Analytics', 'Educational Technology'],
  },
]
