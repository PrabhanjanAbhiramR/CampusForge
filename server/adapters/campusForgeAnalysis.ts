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

function matchesDomainFacet(value: unknown, facet: string[]) {
  if (facet.length === 0) return false
  const normalized = normalizeEvidenceText(JSON.stringify(value))
  if (facet.length === 1) return normalized.split(' ').includes(facet[0])
  return normalized.includes(facet.join(' '))
}

function coveredFacets(value: unknown, facets: string[][]) {
  return facets.filter((facet) => matchesDomainFacet(value, facet)).length
}

function trendFacetCoverage(queryEvidence: GenieQueryEvidence[], facets: string[][]) {
  const trendValues = queryEvidence.flatMap((result) => {
    const trendColumns = result.columns
      .map((column, index) => ({ column: normalizeEvidenceText(column), index }))
      .filter(({ column }) => /(^| )(trend|topic|research area|technology)( |$)/.test(column))
    return trendColumns.flatMap(({ index }) => result.rows.map((row) => row[index]))
  })
  return facets.filter((facet) => trendValues.some((value) => matchesDomainFacet(value, facet))).length
}

function calibrateDirectEvidence(
  analysis: CampusForgeAnalysis,
  query: string,
  queryEvidence: GenieQueryEvidence[],
): CampusForgeAnalysis {
  const facets = domainFacets(query)
  if (facets.length === 0) return analysis

  const categoryEvidence = [analysis.faculty, analysis.labs, analysis.equipment, analysis.projects]
  const rawEvidenceValues = queryEvidence.flatMap((result) => result.rows.flat())
  const directlySupportedFacets = facets.filter((facet) =>
    categoryEvidence.some((items) => items.some((item) => matchesDomainFacet(item, facet)))
      || rawEvidenceValues.some((value) => matchesDomainFacet(value, facet)),
  ).length
  const matchingTrendFacets = trendFacetCoverage(queryEvidence, facets)
  const directEvidenceBreadth = [
    ...categoryEvidence.map((items) => coveredFacets(items, facets) > 0),
    matchingTrendFacets > 0,
  ]
  const domainCoverage = directlySupportedFacets / facets.length
  const breadth = directEvidenceBreadth.filter(Boolean).length / directEvidenceBreadth.length
  const directEvidenceWeight = domainCoverage * ((1 + breadth) / 2)
  const calibratedScore = Math.round(analysis.readiness.maximum * directEvidenceWeight)
  const hasMatchingTrend = matchingTrendFacets === facets.length

  return {
    ...analysis,
    readiness: {
      ...analysis.readiness,
      score: calibratedScore,
      disclaimer: `${analysis.readiness.disclaimer} Score is calibrated to direct domain evidence and its breadth across campus records; adjacent capabilities alone do not establish readiness.`,
    },
    researchTrend: hasMatchingTrend ? analysis.researchTrend : {
      momentum: 'Low',
      summary: 'No directly matching research trend was found in the retrieved campus evidence. Adjacent research areas were not used as a substitute.',
    },
  }
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
  const equipment = analysis.equipment.filter((asset) => isSupported(asset.name))
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
