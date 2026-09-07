export type EvidenceDomainName = 'trends' | 'faculty' | 'labs' | 'equipment' | 'projects'
export type MomentumClassification = 'Low' | 'Medium' | 'Medium-High' | 'High'

export interface ScoredEvidenceItem {
  id: string
  relevance: number
  requirementCoverage: number[]
  attributes: string[]
  provenanceStrength: number
}

export interface ScoredEquipmentItem extends ScoredEvidenceItem {
  status: 'Available' | 'Limited' | 'Unavailable'
  utilization?: number
}

export interface ScoredProjectItem extends ScoredEvidenceItem {
  status: 'Ongoing' | 'Completed'
}

export interface ScoredTrendItem {
  id: string
  relevance: number
  growth: MomentumClassification
  activityScore?: number
  provenanceStrength: number
}

export interface EvidenceGroup<T extends ScoredEvidenceItem> {
  direct: T[]
  adjacent: T[]
}

export interface EvidenceDomainResult {
  domain: EvidenceDomainName
  completed: boolean
  attachmentCount: number
  rowCount: number
}

export interface ReadinessEngineInput {
  requirementCount: number
  faculty: EvidenceGroup<ScoredEvidenceItem>
  labs: EvidenceGroup<ScoredEvidenceItem>
  equipment: EvidenceGroup<ScoredEquipmentItem>
  projects: EvidenceGroup<ScoredProjectItem>
  trends: { direct: ScoredTrendItem[]; adjacent: ScoredTrendItem[] }
  retrieval: EvidenceDomainResult[]
  uncoveredFacultyRequirements?: string[]
}

export interface ReadinessCategoryScore {
  score: number
  maximum: number
  explanation: string
}

export interface ReadinessCategoryBreakdown {
  faculty: ReadinessCategoryScore
  labs: ReadinessCategoryScore
  equipment: ReadinessCategoryScore
  projects: ReadinessCategoryScore
  momentum: ReadinessCategoryScore
}

export interface DetectedReadinessGap {
  code: string
  title: string
  explanation: string
}

export interface ReadinessEngineResult {
  score: number
  maximum: 100
  confidence: number
  verdict: string
  momentum: MomentumClassification
  categories: ReadinessCategoryBreakdown
  gaps: DetectedReadinessGap[]
}

const expectedDomains: EvidenceDomainName[] = ['trends', 'faculty', 'labs', 'equipment', 'projects']

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value))
}

function average(values: number[], fallback = 0) {
  return values.length > 0 ? values.reduce((total, value) => total + value, 0) / values.length : fallback
}

function coverage(items: ScoredEvidenceItem[], requirementCount: number) {
  if (items.length === 0 || requirementCount <= 0) return 0
  let covered = 0
  for (let index = 0; index < requirementCount; index += 1) {
    covered += Math.max(...items.map((item) => clamp(item.requirementCoverage[index] ?? 0)))
  }
  return covered / requirementCount
}

function attributeBreadth(items: ScoredEvidenceItem[], target: number) {
  const attributes = new Set(items.flatMap((item) => item.attributes.map((value) => value.trim().toLocaleLowerCase()).filter(Boolean)))
  return clamp(attributes.size / target)
}

function adjacentSupport(count: number, maximum: number) {
  return maximum * clamp(count / 3)
}

function category(score: number, maximum: number, explanation: string): ReadinessCategoryScore {
  return { score: Math.round(clamp(score, 0, maximum)), maximum, explanation }
}

function scoreFaculty(input: ReadinessEngineInput) {
  const direct = input.faculty.direct
  const score = 12 * clamp(direct.length / 3)
    + 6 * average(direct.map((item) => clamp(item.relevance)))
    + 5 * coverage(direct, input.requirementCount)
    + 2 * attributeBreadth(direct, 6)
    + adjacentSupport(input.faculty.adjacent.length, 2)
  return category(score, 25, `${direct.length} direct and ${input.faculty.adjacent.length} adjacent faculty records; score reflects relevance, opportunity-requirement coverage, and complementary expertise.`)
}

function scoreLabs(input: ReadinessEngineInput) {
  const direct = input.labs.direct
  const score = 9 * clamp(direct.length / 2)
    + 5 * average(direct.map((item) => clamp(item.relevance)))
    + 4 * coverage(direct, input.requirementCount)
    + 2 * attributeBreadth(direct, 6)
    + adjacentSupport(input.labs.adjacent.length, 1)
  return category(score, 20, `${direct.length} direct and ${input.labs.adjacent.length} adjacent labs; score reflects relevance, requirement coverage, and capability breadth.`)
}

function equipmentCapacity(item: ScoredEquipmentItem) {
  const statusWeight = item.status === 'Available' ? 1 : item.status === 'Limited' ? 0.5 : 0
  const spareCapacity = typeof item.utilization === 'number' ? clamp((100 - item.utilization) / 100) : 0.5
  return statusWeight * (0.5 + 0.5 * spareCapacity)
}

function scoreEquipment(input: ReadinessEngineInput) {
  const direct = input.equipment.direct
  const score = 7 * clamp(direct.length / 4)
    + 4 * average(direct.map((item) => clamp(item.relevance)))
    + 3 * coverage(direct, input.requirementCount)
    + 5 * average(direct.map(equipmentCapacity))
    + attributeBreadth(direct, 5)
    + adjacentSupport(input.equipment.adjacent.length, 1)
  return category(score, 20, `${direct.length} direct and ${input.equipment.adjacent.length} adjacent assets; score reflects relevance, complementary capability, availability, and reported spare capacity.`)
}

function scoreProjects(input: ReadinessEngineInput) {
  const direct = input.projects.direct
  const experience = average(direct.map((item) => item.status === 'Completed' ? 1 : 0.75))
  const score = 8 * clamp(direct.length / 3)
    + 5 * average(direct.map((item) => clamp(item.relevance)))
    + 4 * coverage(direct, input.requirementCount)
    + 2 * experience
    + attributeBreadth(direct, 6)
    + adjacentSupport(input.projects.adjacent.length, 1)
  return category(score, 20, `${direct.length} direct and ${input.projects.adjacent.length} adjacent projects; score reflects domain relevance, requirement breadth, and completed/ongoing experience.`)
}

function momentumValue(growth: MomentumClassification) {
  if (growth === 'High') return 1
  if (growth === 'Medium-High') return 0.8
  if (growth === 'Medium') return 0.6
  return 0.25
}

function strongestMomentum(trends: ScoredTrendItem[]): MomentumClassification {
  const values: MomentumClassification[] = ['High', 'Medium-High', 'Medium', 'Low']
  return values.find((value) => trends.some((trend) => trend.growth === value)) ?? 'Low'
}

function scoreMomentum(input: ReadinessEngineInput) {
  const direct = input.trends.direct
  if (direct.length === 0) {
    return {
      momentum: 'Low' as const,
      category: category(0, 15, 'No directly matched research trend was returned; adjacent trends contribute no momentum points.'),
    }
  }
  const momentum = strongestMomentum(direct)
  const strongest = direct.filter((trend) => trend.growth === momentum)
  const relevance = average(strongest.map((trend) => clamp(trend.relevance)))
  const activityScores = strongest.flatMap((trend) => typeof trend.activityScore === 'number' ? [clamp(trend.activityScore / 100)] : [])
  const signal = activityScores.length > 0
    ? 0.7 * momentumValue(momentum) + 0.3 * average(activityScores)
    : momentumValue(momentum)
  return {
    momentum,
    category: category(15 * signal * relevance, 15, `${direct.length} directly matched trend records; score uses the ${momentum} growth classification${activityScores.length > 0 ? ' and reported research activity' : ''}, weighted by domain relevance.`),
  }
}

export function readinessVerdict(score: number) {
  if (score >= 85) return 'Strong direct-evidence fit'
  if (score >= 70) return 'Good foundation'
  if (score >= 50) return 'Moderate readiness'
  if (score >= 30) return 'Limited readiness'
  return 'Insufficient direct evidence'
}

function evidenceConfidence(input: ReadinessEngineInput) {
  const byDomain = new Map(input.retrieval.map((result) => [result.domain, result]))
  const domainCompletion = expectedDomains.filter((domain) => byDomain.get(domain)?.completed).length / expectedDomains.length
  const resultCoverage = expectedDomains.filter((domain) => (byDomain.get(domain)?.attachmentCount ?? 0) > 0).length / expectedDomains.length
  const directEvidence = [
    ...input.faculty.direct,
    ...input.labs.direct,
    ...input.equipment.direct,
    ...input.projects.direct,
    ...input.trends.direct,
  ]
  const provenance = average(directEvidence.map((item) => clamp(item.provenanceStrength)), 1)
  return Math.round(100 * (0.5 * domainCompletion + 0.3 * resultCoverage + 0.2 * provenance))
}

function detectGaps(input: ReadinessEngineInput, momentum: MomentumClassification) {
  const gaps: DetectedReadinessGap[] = []
  if (input.faculty.direct.length === 0) {
    gaps.push({ code: 'no-direct-faculty', title: 'No directly relevant faculty', explanation: 'No faculty record directly matched the opportunity requirements in the retrieved evidence.' })
  } else if (input.faculty.direct.length < 2 || coverage(input.faculty.direct, input.requirementCount) < 0.75) {
    gaps.push({ code: 'insufficient-faculty-breadth', title: 'Insufficient faculty breadth', explanation: 'Direct faculty evidence is present but does not yet show broad, complementary coverage of the opportunity requirements.' })
  }
  if (input.labs.direct.length === 0) {
    gaps.push({ code: 'no-direct-lab', title: 'No directly relevant lab', explanation: 'No lab capability directly matched the opportunity in the retrieved evidence.' })
  }
  if (input.equipment.direct.length === 0) {
    gaps.push({ code: 'no-direct-equipment', title: 'No directly relevant equipment', explanation: 'No equipment asset directly matched the opportunity in the retrieved evidence.' })
  } else if (average(input.equipment.direct.map(equipmentCapacity)) < 0.4) {
    gaps.push({ code: 'constrained-equipment', title: 'Equipment capacity constraint', explanation: 'Directly relevant equipment is unavailable, limited, or reports high utilization, reducing usable capacity.' })
  }
  if (input.projects.direct.length === 0) {
    gaps.push({ code: 'no-direct-projects', title: 'No directly relevant project experience', explanation: 'No existing project directly matched the requested research domain.' })
  }
  if (input.trends.direct.length === 0 || momentum === 'Low') {
    gaps.push({ code: 'weak-direct-trend', title: 'Weak direct research momentum', explanation: 'No meaningful directly matched research-trend signal was present in the retrieved evidence.' })
  }
  if (input.faculty.direct.length > 0 && (input.uncoveredFacultyRequirements?.length ?? 0) > 0) {
    gaps.push({
      code: 'missing-domain-side-expertise',
      title: 'Incomplete domain-side expertise',
      explanation: `Technical capability is present, but direct faculty evidence does not cover: ${input.uncoveredFacultyRequirements!.join(', ')}.`,
    })
  }
  return gaps
}

export function calculateReadiness(input: ReadinessEngineInput): ReadinessEngineResult {
  const faculty = scoreFaculty(input)
  const labs = scoreLabs(input)
  const equipment = scoreEquipment(input)
  const projects = scoreProjects(input)
  const momentumResult = scoreMomentum(input)
  const categories = { faculty, labs, equipment, projects, momentum: momentumResult.category }
  const score = Object.values(categories).reduce((total, item) => total + item.score, 0)
  return {
    score,
    maximum: 100,
    confidence: evidenceConfidence(input),
    verdict: readinessVerdict(score),
    momentum: momentumResult.momentum,
    categories,
    gaps: detectGaps(input, momentumResult.momentum),
  }
}
