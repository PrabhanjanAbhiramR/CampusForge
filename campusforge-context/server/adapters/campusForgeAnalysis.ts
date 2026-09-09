import type { CampusForgeAnalysis } from '../../src/data/mockAnalysis'
import type { GenieAttachment, GenieMessage, GenieQueryEvidence } from '../services/databricksGenie'

export interface SafeGenieStructure {
  status: string
  topLevelKeys: string[]
  attachmentCount: number
  queryResultKeys: string[]
  attachmentStructures: Array<{
    index: number
    keys: string[]
    attachmentIdPresent: boolean
    hasText: boolean
    textPurpose?: string
    textLength: number
    hasGeneratedSql: boolean
    sqlLength: number
    queryKeys: string[]
    reportedRowCount?: number
  }>
}

export interface SafeQueryEvidenceSummary {
  queryAttachmentCount: number
  results: Array<{ rowCount: number; fieldNames: string[] }>
}

export class CampusForgeAdapterError extends Error {
  readonly structure: SafeGenieStructure

  constructor(message: string, structure: SafeGenieStructure) {
    super(message)
    this.name = 'CampusForgeAdapterError'
    this.structure = structure
  }
}

export function summarizeGenieMessage(message: GenieMessage): SafeGenieStructure {
  return {
    status: message.status ?? 'UNKNOWN',
    topLevelKeys: Object.keys(message).sort(),
    attachmentCount: message.attachments?.length ?? 0,
    queryResultKeys: message.query_result && typeof message.query_result === 'object'
      ? Object.keys(message.query_result).sort()
      : [],
    attachmentStructures: (message.attachments ?? []).map((attachment, index) => ({
      index,
      keys: Object.keys(attachment).sort(),
      attachmentIdPresent: typeof attachment.attachment_id === 'string',
      hasText: typeof attachment.text?.content === 'string',
      textPurpose: attachment.text?.purpose,
      textLength: attachment.text?.content?.length ?? 0,
      hasGeneratedSql: typeof attachment.query?.query === 'string',
      sqlLength: attachment.query?.query?.length ?? 0,
      queryKeys: attachment.query ? Object.keys(attachment.query).sort() : [],
      reportedRowCount: typeof attachment.query?.query_result_metadata === 'object'
        && attachment.query.query_result_metadata
        && 'row_count' in attachment.query.query_result_metadata
        && typeof attachment.query.query_result_metadata.row_count === 'number'
        ? attachment.query.query_result_metadata.row_count
        : undefined,
    })),
  }
}

export function summarizeQueryEvidence(evidence: GenieQueryEvidence[]): SafeQueryEvidenceSummary {
  return {
    queryAttachmentCount: evidence.length,
    results: evidence.map((result) => ({ rowCount: result.rowCount, fieldNames: result.columns })),
  }
}

function collectJsonCandidates(value: unknown, key?: string): string[] {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return key === 'content' || trimmed.startsWith('{') || trimmed.startsWith('```') ? [trimmed] : []
  }
  if (Array.isArray(value)) return value.flatMap((item) => collectJsonCandidates(item))
  if (!value || typeof value !== 'object') return []
  return Object.entries(value).flatMap(([childKey, childValue]) => collectJsonCandidates(childValue, childKey))
}

function parseCandidate(candidate: string): unknown {
  const withoutFences = candidate.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  const firstBrace = withoutFences.indexOf('{')
  const lastBrace = withoutFences.lastIndexOf('}')
  if (firstBrace < 0 || lastBrace <= firstBrace) return null

  try {
    return JSON.parse(withoutFences.slice(firstBrace, lastBrace + 1))
  } catch {
    return null
  }
}

function isCampusForgeAnalysis(value: unknown): value is CampusForgeAnalysis {
  if (!value || typeof value !== 'object') return false
  const analysis = value as Partial<CampusForgeAnalysis>
  return Boolean(
    analysis.opportunity?.title
    && analysis.opportunity.rationale
    && typeof analysis.readiness?.score === 'number'
    && typeof analysis.readiness.maximum === 'number'
    && analysis.researchTrend?.momentum
    && Array.isArray(analysis.faculty)
    && Array.isArray(analysis.labs)
    && Array.isArray(analysis.equipment)
    && Array.isArray(analysis.projects)
    && Array.isArray(analysis.gaps)
    && Array.isArray(analysis.collaboration?.departments)
    && Array.isArray(analysis.collaboration?.members)
    && analysis.recommendation?.summary
    && Array.isArray(analysis.evidence)
    && typeof analysis.researchConnection === 'string',
  )
}

function normalizeEvidenceText(value: unknown) {
  return String(value ?? '').toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

const queryFramingWords = new Set([
  'a', 'an', 'and', 'are', 'at', 'be', 'campus', 'can', 'capacity', 'could', 'current', 'do', 'does',
  'facilities', 'fit', 'for', 'have', 'in', 'initiative', 'is', 'lead', 'of', 'on', 'opportunities',
  'opportunity', 'our', 'project', 'pursue', 'research', 'the', 'to', 'university', 'we', 'what', 'which', 'with',
  'institution', 'institutional',
])

function domainFacets(query: string) {
  const facets: string[][] = []
  let currentFacet: string[] = []

  for (const token of normalizeEvidenceText(query).split(' ')) {
    if (!token || queryFramingWords.has(token)) {
      if (currentFacet.length > 0) facets.push(currentFacet)
      currentFacet = []
    } else {
      currentFacet.push(token)
    }
  }
  if (currentFacet.length > 0) facets.push(currentFacet)
  return facets
}

function evidenceToken(value: string) {
  if (value.endsWith('ics') && value.length > 5) return value.slice(0, -3)
  if (value.endsWith('s') && !value.endsWith('ous') && value.length > 4) return value.slice(0, -1)
  return value
}

function matchesDomainFacet(value: unknown, facet: string[]) {
  if (facet.length === 0) return false
  const normalized = normalizeEvidenceText(JSON.stringify(value))
  const valueTokens = new Set(normalized.split(' ').map(evidenceToken))
  return facet.every((token) => valueTokens.has(evidenceToken(token)))
}

function evidenceRows(queryEvidence: GenieQueryEvidence[]) {
  return queryEvidence.flatMap((result) => result.rows.map((row) => Object.fromEntries(
    result.columns.map((column, index) => [
      normalizeEvidenceText(column).replace(/ /g, '_'),
      row[index],
    ]),
  )))
}

function queryDomainTokens(facets: string[][]) {
  return new Set(facets.flat())
}

function trendSignalValue(row: Record<string, unknown>) {
  return row.growth ?? row.growth_indicator ?? row.momentum
    ?? Object.values(row).find((value) => /^(low|medium|medium high|moderate|high)$/.test(normalizeEvidenceText(value)))
}

function directlyMatchedTrendRows(rows: Array<Record<string, unknown>>, facets: string[][]) {
  const domainTokens = queryDomainTokens(facets)
  return rows.flatMap((row) => {
    const source = normalizeEvidenceText(row.source_table ?? row.source ?? '')
    const trendValue = row.research_area ?? row.domain_field ?? row.trend ?? row.topic ?? row.technology
      ?? row.name ?? row.name_or_title ?? row.entity_name
    const trendSignal = trendSignalValue(row)
    if (!trendValue || !trendSignal || (source && !/(trend|research area)/.test(source))) return []

    const trendTokens = normalizeEvidenceText(trendValue).split(' ').filter(Boolean)
    const minimumTokens = domainTokens.size > 1 ? 2 : 1
    const direct = trendTokens.length >= minimumTokens
      && trendTokens.every((token) => domainTokens.has(token) || queryFramingWords.has(token))
    return direct ? [{ row, facet: trendTokens.filter((token) => !queryFramingWords.has(token)) }] : []
  })
}

function trendMomentum(matches: Array<{ row: Record<string, unknown> }>): CampusForgeAnalysis['researchTrend']['momentum'] {
  const indicators = matches.map(({ row }) => normalizeEvidenceText(trendSignalValue(row)))
  if (indicators.some((indicator) => indicator === 'high')) return 'High'
  if (indicators.some((indicator) => indicator === 'medium high')) return 'Medium-High'
  if (indicators.some((indicator) => indicator === 'medium' || indicator === 'moderate')) return 'Medium'
  return 'Low'
}

type DirectCategory = 'faculty' | 'labs' | 'equipment' | 'projects'

function rowHasCategory(row: Record<string, unknown>, category: DirectCategory) {
  const categoryLabel = normalizeEvidenceText([
    row.evidence_role,
    row.entity_type,
    row.source_table,
    row.source,
  ].filter(Boolean).join(' '))
  if (category === 'faculty') return Boolean(/faculty/.test(categoryLabel) || row.faculty_id || row.expertise)
  if (category === 'labs') return Boolean(/\blab/.test(categoryLabel) || row.lab_name || row.lab_capabilities)
  if (category === 'equipment') return Boolean(/equipment/.test(categoryLabel) || row.equipment_id || row.equipment_name)
  return Boolean(/project/.test(categoryLabel) || row.project_name || row.project_title)
}

function directItems<T>(items: T[], facets: string[][]) {
  return items.filter((item) => facets.some((facet) => matchesDomainFacet(item, facet)))
}

function directRawRows(rows: Array<Record<string, unknown>>, category: DirectCategory, facets: string[][]) {
  return rows.filter((row) => rowHasCategory(row, category)
    && facets.some((facet) => matchesDomainFacet(row, facet)))
}

function rawEntityKey(row: Record<string, unknown>, category: DirectCategory) {
  if (category === 'faculty') return row.faculty_id ?? row.entity_id ?? row.name ?? row.name_or_title ?? row.id
  if (category === 'labs') return row.lab_id ?? row.entity_id ?? row.lab_name ?? row.name_or_title ?? row.id
  if (category === 'equipment') return row.equipment_id ?? row.entity_id ?? row.equipment_name ?? row.name_or_title ?? row.id
  return row.project_id ?? row.entity_id ?? row.project_name ?? row.project_title ?? row.name_or_title ?? row.id
}

function directCount<T extends { id: string }>(items: T[], rows: Array<Record<string, unknown>>, category: DirectCategory) {
  const keys = new Set(items.map((item) => normalizeEvidenceText(item.id)))
  rows.forEach((row) => {
    const key = normalizeEvidenceText(rawEntityKey(row, category))
    if (key) keys.add(key)
  })
  return keys.size
}

function equipmentAvailability(items: CampusForgeAnalysis['equipment'], rawRows: Array<Record<string, unknown>>) {
  const statusByEquipment = new Map<string, string>(
    items.map((item) => [normalizeEvidenceText(item.id), item.status]),
  )
  rawRows.forEach((row) => {
    const key = normalizeEvidenceText(rawEntityKey(row, 'equipment'))
    if (key && !statusByEquipment.has(key)) {
      statusByEquipment.set(key, String(row.availability ?? row.status ?? ''))
    }
  })
  const statuses = [...statusByEquipment.values()]
  if (statuses.length === 0) return 0
  const weights: number[] = statuses.map((status) => status === 'Available' ? 1 : status === 'Limited' ? 0.5 : 0)
  return weights.reduce((total, weight) => total + weight, 0) / weights.length
}

function verdictFor(score: number, hasDirectEvidence: boolean) {
  if (!hasDirectEvidence) return 'Insufficient direct evidence'
  if (score >= 75) return 'Strong direct-evidence fit'
  if (score >= 50) return 'Moderate direct-evidence fit'
  return 'Limited direct evidence'
}

function calibrateDirectEvidence(
  analysis: CampusForgeAnalysis,
  query: string,
  queryEvidence: GenieQueryEvidence[],
): CampusForgeAnalysis {
  const facets = domainFacets(query)
  if (facets.length === 0) return analysis

  const rows = evidenceRows(queryEvidence)
  const trendMatches = directlyMatchedTrendRows(rows, facets)
  const uniqueTrendMatches = [...new Map(trendMatches.map((match) => [
    normalizeEvidenceText(match.row.id ?? match.row.research_area ?? match.row.domain_field),
    match,
  ])).values()]
  const trendFacets = uniqueTrendMatches.map((match) => match.facet)
  const matchedTrendTokens = trendFacets.flatMap((facet) => facet
    .filter((token) => token.length >= 5)
    .map((token) => [token]))
  const matchingFacets = [...facets, ...trendFacets, ...matchedTrendTokens]
  const faculty = directItems(analysis.faculty, matchingFacets)
  const labs = directItems(analysis.labs, matchingFacets)
  const equipment = directItems(analysis.equipment, matchingFacets)
  const projects = directItems(analysis.projects, matchingFacets)
  const rawFaculty = directRawRows(rows, 'faculty', matchingFacets)
  const rawLabs = directRawRows(rows, 'labs', matchingFacets)
  const rawEquipment = directRawRows(rows, 'equipment', matchingFacets)
  const rawProjects = directRawRows(rows, 'projects', matchingFacets)
  const categoryContributions = [
    faculty.length > 0 || rawFaculty.length > 0 ? 1 : 0,
    labs.length > 0 || rawLabs.length > 0 ? 1 : 0,
    equipmentAvailability(equipment, rawEquipment),
    projects.length > 0 || rawProjects.length > 0 ? 1 : 0,
    uniqueTrendMatches.length > 0 ? 1 : 0,
  ]
  const totalContribution = categoryContributions.reduce((total, contribution) => total + contribution, 0)
  const calibratedScore = Math.round(analysis.readiness.maximum * totalContribution / categoryContributions.length)
  const verdict = verdictFor(calibratedScore, totalContribution > 0)
  const momentum = trendMomentum(uniqueTrendMatches)
  console.info('CampusForge direct evidence counts:', JSON.stringify({
    faculty: directCount(faculty, rawFaculty, 'faculty'),
    labs: directCount(labs, rawLabs, 'labs'),
    equipment: directCount(equipment, rawEquipment, 'equipment'),
    projects: directCount(projects, rawProjects, 'projects'),
    trends: uniqueTrendMatches.length,
  }))

  return {
    ...analysis,
    opportunity: { ...analysis.opportunity, verdict },
    readiness: {
      ...analysis.readiness,
      score: calibratedScore,
      disclaimer: `${analysis.readiness.disclaimer} Score is calibrated to direct domain evidence and its breadth across campus records; adjacent capabilities alone do not establish readiness.`,
    },
    researchTrend: {
      momentum,
      summary: uniqueTrendMatches.length > 0
        ? `Momentum is based on ${uniqueTrendMatches.length} directly matched research trend record${uniqueTrendMatches.length === 1 ? '' : 's'}.`
        : 'No directly matching research trend was found in the retrieved campus evidence. Adjacent research areas were not used as a substitute.',
    },
    recommendation: { ...analysis.recommendation, verdict },
  }
}

function mapEquipmentLabIds(
  equipment: CampusForgeAnalysis['equipment'],
  labs: CampusForgeAnalysis['labs'],
  queryEvidence: GenieQueryEvidence[],
) {
  const rows = evidenceRows(queryEvidence)
  const labByReference = new Map(labs.flatMap((lab) => [
    [normalizeEvidenceText(lab.id), lab.id],
    [normalizeEvidenceText(lab.name), lab.id],
  ]))

  return equipment.map((asset) => {
    const existingLabId = labByReference.get(normalizeEvidenceText(asset.labId))
    if (existingLabId) return { ...asset, labId: existingLabId }

    const evidenceRow = rows.find((row) => {
      const evidenceId = row.equipment_id ?? row.id
      const evidenceName = row.equipment_name ?? row.name
      return normalizeEvidenceText(evidenceId) === normalizeEvidenceText(asset.id)
        || normalizeEvidenceText(evidenceName) === normalizeEvidenceText(asset.name)
    })
    const mappedLabId = labByReference.get(normalizeEvidenceText(
      evidenceRow?.lab_id ?? evidenceRow?.lab_name ?? evidenceRow?.department_or_lab,
    ))
    return mappedLabId ? { ...asset, labId: mappedLabId } : asset
  })
}

function groundAnalysis(
  analysis: CampusForgeAnalysis,
  originalMessage: GenieMessage,
  queryEvidence: GenieQueryEvidence[],
): CampusForgeAnalysis {
  const narrative = (originalMessage.attachments ?? [])
    .flatMap((attachment) => attachment.text?.content ? [attachment.text.content] : [])
  const evidenceCorpus = normalizeEvidenceText(JSON.stringify({ narrative, queryEvidence }))
  const isSupported = (label: string) => evidenceCorpus.includes(normalizeEvidenceText(label))

  const faculty = analysis.faculty.filter((person) => isSupported(person.name))
  const labs = analysis.labs.filter((lab) => isSupported(lab.name))
  const equipment = mapEquipmentLabIds(
    analysis.equipment.filter((asset) => isSupported(asset.name)),
    labs,
    queryEvidence,
  )
  const projects = analysis.projects.filter((project) => isSupported(project.title))
  const facultyIds = new Set(faculty.map((person) => person.id))

  return {
    ...analysis,
    faculty,
    labs,
    equipment,
    projects,
    collaboration: {
      ...analysis.collaboration,
      members: analysis.collaboration.members.filter((member) => facultyIds.has(member.facultyId)),
    },
  }
}

export function adaptGenieMessage(
  message: GenieMessage,
  groundingMessage: GenieMessage = message,
  queryEvidence: GenieQueryEvidence[] = [],
  query = '',
): CampusForgeAnalysis {
  const orderedAttachments = [...(message.attachments ?? [])].sort((left, right) => {
    const priority = (attachment: GenieAttachment) => attachment.text?.purpose === 'TEXT_ATTACHMENT_PURPOSE_ANSWER' ? 0 : 1
    return priority(left) - priority(right)
  })

  for (const candidate of collectJsonCandidates(orderedAttachments)) {
    const parsed = parseCandidate(candidate)
    if (isCampusForgeAnalysis(parsed)) {
      const grounded = groundAnalysis(parsed, groundingMessage, queryEvidence)
      return calibrateDirectEvidence(grounded, query, queryEvidence)
    }
  }

  throw new CampusForgeAdapterError(
    'Genie completed, but its response could not be mapped to the CampusForge analysis contract.',
    summarizeGenieMessage(message),
  )
}
