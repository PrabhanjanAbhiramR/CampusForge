import type {
  CampusForgeAnalysis,
  CanonicalEvidence,
  EquipmentAsset,
  FacultyMember,
  Lab,
  ResearchProject,
  TrendEvidenceRecord,
} from '../../src/data/mockAnalysis'
import {
  calculateReadiness,
  type EvidenceDomainResult,
  type ScoredEquipmentItem,
  type ScoredEvidenceItem,
  type ScoredProjectItem,
  type ScoredTrendItem,
} from '../scoring/readinessEngine.ts'
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
    [...result.columns.map((column, index) => [
      normalizeEvidenceText(column).replace(/ /g, '_'),
      row[index],
    ]), ['_campusforge_domain', result.domain]],
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
    row._campusforge_domain,
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

function requirementCoverage(value: unknown, facets: string[][]) {
  const tokens = new Set(normalizeEvidenceText(JSON.stringify(value)).split(' ').map(evidenceToken).filter(Boolean))
  return facets.map((facet) => facet.length > 0
    ? facet.filter((token) => tokens.has(evidenceToken(token))).length / facet.length
    : 0)
}

function evidenceAttributes(value: unknown, category: DirectCategory) {
  const record = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const selected = category === 'faculty'
    ? [record.expertise, record.expertise_areas, record.research_domains]
    : category === 'labs'
      ? [record.capabilities, record.lab_capabilities, record.focus]
      : category === 'equipment'
        ? [record.capability, record.capabilities, record.equipment_type]
        : [record.fields, record.research_area, record.technologies]
  return selected.flatMap((item) => Array.isArray(item) ? item : typeof item === 'string' ? item.split(/[,;|]/) : [])
    .map((item) => String(item).trim())
    .filter(Boolean)
}

function scoredItems(
  items: Array<{ id: string }>,
  rows: Array<Record<string, unknown>>,
  category: DirectCategory,
  facets: string[][],
): ScoredEvidenceItem[] {
  const scored = new Map<string, ScoredEvidenceItem>()
  const canonicalIds = new Set(items.map((item) => normalizeEvidenceText(item.id)).filter(Boolean))
  const rawKeys = new Set(rows.map((row) => normalizeEvidenceText(rawEntityKey(row, category))).filter(Boolean))
  const add = (idValue: unknown, value: unknown, provenanceStrength: number) => {
    const id = normalizeEvidenceText(idValue)
    if (!id) return
    const coverage = requirementCoverage(value, facets)
    const next: ScoredEvidenceItem = {
      id,
      relevance: Math.max(coverage.length > 0 ? Math.max(...coverage) : 0, 0.65),
      requirementCoverage: coverage,
      attributes: evidenceAttributes(value, category),
      provenanceStrength,
    }
    const existing = scored.get(id)
    scored.set(id, existing ? {
      ...existing,
      relevance: Math.max(existing.relevance, next.relevance),
      requirementCoverage: existing.requirementCoverage.map((amount, index) => Math.max(amount, next.requirementCoverage[index] ?? 0)),
      attributes: [...new Set([...existing.attributes, ...next.attributes])],
      provenanceStrength: Math.max(existing.provenanceStrength, next.provenanceStrength),
    } : next)
  }
  items.forEach((item) => add(item.id, item, rawKeys.has(normalizeEvidenceText(item.id)) ? 1 : 0.7))
  rows.forEach((row) => {
    if (canonicalIds.has(normalizeEvidenceText(rawEntityKey(row, category)))) {
      add(rawEntityKey(row, category), row, 1)
    }
  })
  return [...scored.values()]
}

function equipmentStatus(value: unknown): ScoredEquipmentItem['status'] {
  const normalized = normalizeEvidenceText(value)
  if (normalized === 'available') return 'Available'
  if (normalized === 'limited') return 'Limited'
  return 'Unavailable'
}

function projectStatus(value: unknown): ScoredProjectItem['status'] {
  return normalizeEvidenceText(value) === 'completed' ? 'Completed' : 'Ongoing'
}

function numericValue(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value)
  return undefined
}

function stringValue(...values: unknown[]) {
  return values.find((value): value is string => typeof value === 'string' && Boolean(value.trim()))?.trim()
}

function stringList(...values: unknown[]) {
  const value = values.find((candidate) => Array.isArray(candidate) || typeof candidate === 'string')
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean)
  return typeof value === 'string' ? value.split(/[,;|]/).map((item) => item.trim()).filter(Boolean) : []
}

function mapFacultyRow(row: Record<string, unknown>): FacultyMember | null {
  const id = stringValue(row.faculty_id, row.id, row.entity_id)
  const name = stringValue(row.faculty_name, row.name, row.name_or_title, row.entity_name)
  if (!id || !name) return null
  return {
    id,
    name,
    department: stringValue(row.department, row.department_name) ?? 'Not reported',
    expertise: stringList(row.expertise, row.expertise_areas, row.research_domains),
  }
}

function mapLabRow(row: Record<string, unknown>): Lab | null {
  const id = stringValue(row.lab_id, row.id, row.entity_id)
  const name = stringValue(row.lab_name, row.name, row.name_or_title, row.entity_name)
  if (!id || !name) return null
  return {
    id,
    name,
    capabilities: stringList(row.capabilities, row.lab_capabilities, row.focus),
  }
}

function mapEquipmentRow(row: Record<string, unknown>): EquipmentAsset | null {
  const id = stringValue(row.equipment_id, row.id, row.entity_id)
  const name = stringValue(row.equipment_name, row.name, row.name_or_title, row.entity_name)
  const utilization = numericValue(row.utilization ?? row.utilization_percent)
  if (!id || !name || utilization === undefined) return null
  return {
    id,
    name,
    labId: stringValue(row.lab_id, row.lab_name, row.department_or_lab) ?? '',
    capability: stringValue(row.capability, row.capabilities, row.equipment_type) ?? 'Not reported',
    utilization,
    status: equipmentStatus(row.availability ?? row.status),
  }
}

function mapProjectRow(row: Record<string, unknown>): ResearchProject | null {
  const id = stringValue(row.project_id, row.id, row.entity_id)
  const title = stringValue(row.project_title, row.project_name, row.title, row.name_or_title, row.entity_name)
  if (!id || !title) return null
  return {
    id,
    title,
    status: projectStatus(row.status),
    fields: stringList(row.fields, row.research_area, row.technologies, row.domain_field),
  }
}

function mapTrendRow(row: Record<string, unknown>): TrendEvidenceRecord | null {
  const researchArea = stringValue(row.research_area, row.domain_field, row.trend, row.topic, row.technology, row.name)
  const growthValue = trendSignalValue(row)
  if (!researchArea || !growthValue) return null
  return {
    id: stringValue(row.id, row.trend_id) ?? researchArea,
    researchArea,
    growth: trendMomentum([{ row }]),
    activityScore: numericValue(row.research_activity_score ?? row.activity_score ?? row.score ?? row.publication_activity),
  }
}

function uniqueEntities<T extends { id: string }>(items: T[]) {
  return [...new Map(items.map((item) => [normalizeEvidenceText(item.id), item])).values()]
}

function withoutDirect<T extends { id: string }>(items: T[], direct: T[]) {
  const directIds = new Set(direct.map((item) => normalizeEvidenceText(item.id)))
  return items.filter((item) => !directIds.has(normalizeEvidenceText(item.id)))
}

function mappedRows<T>(rows: Array<Record<string, unknown>>, mapper: (row: Record<string, unknown>) => T | null) {
  return rows.flatMap((row) => {
    const mapped = mapper(row)
    return mapped ? [mapped] : []
  })
}

function buildCanonicalEvidence(
  analysis: CampusForgeAnalysis,
  rows: Array<Record<string, unknown>>,
  direct: {
    faculty: CampusForgeAnalysis['faculty']
    labs: CampusForgeAnalysis['labs']
    equipment: CampusForgeAnalysis['equipment']
    projects: CampusForgeAnalysis['projects']
    facultyRows: Array<Record<string, unknown>>
    labRows: Array<Record<string, unknown>>
    equipmentRows: Array<Record<string, unknown>>
    projectRows: Array<Record<string, unknown>>
    trendRows: Array<Record<string, unknown>>
  },
): CanonicalEvidence {
  const allFacultyRows = rows.filter((row) => rowHasCategory(row, 'faculty'))
  const allLabRows = rows.filter((row) => rowHasCategory(row, 'labs'))
  const allEquipmentRows = rows.filter((row) => rowHasCategory(row, 'equipment'))
  const allProjectRows = rows.filter((row) => rowHasCategory(row, 'projects'))
  const directFaculty = uniqueEntities([...mappedRows(direct.facultyRows, mapFacultyRow), ...direct.faculty])
  const directLabs = uniqueEntities([...mappedRows(direct.labRows, mapLabRow), ...direct.labs])
  const directEquipment = uniqueEntities([...mappedRows(direct.equipmentRows, mapEquipmentRow), ...direct.equipment])
  const directProjects = uniqueEntities([...mappedRows(direct.projectRows, mapProjectRow), ...direct.projects])
  const directTrends = uniqueEntities(mappedRows(direct.trendRows, mapTrendRow))

  return {
    faculty: {
      direct: directFaculty,
      adjacent: withoutDirect(uniqueEntities([
        ...mappedRows(allFacultyRows.filter((row) => !direct.facultyRows.includes(row)), mapFacultyRow),
        ...analysis.faculty.filter((item) => !direct.faculty.includes(item)),
      ]), directFaculty),
    },
    labs: {
      direct: directLabs,
      adjacent: withoutDirect(uniqueEntities([
        ...mappedRows(allLabRows.filter((row) => !direct.labRows.includes(row)), mapLabRow),
        ...analysis.labs.filter((item) => !direct.labs.includes(item)),
      ]), directLabs),
    },
    equipment: {
      direct: directEquipment,
      adjacent: withoutDirect(uniqueEntities([
        ...mappedRows(allEquipmentRows.filter((row) => !direct.equipmentRows.includes(row)), mapEquipmentRow),
        ...analysis.equipment.filter((item) => !direct.equipment.includes(item)),
      ]), directEquipment),
    },
    projects: {
      direct: directProjects,
      adjacent: withoutDirect(uniqueEntities([
        ...mappedRows(allProjectRows.filter((row) => !direct.projectRows.includes(row)), mapProjectRow),
        ...analysis.projects.filter((item) => !direct.projects.includes(item)),
      ]), directProjects),
    },
    trends: {
      direct: directTrends,
      adjacent: withoutDirect(uniqueEntities(mappedRows(
        rows.filter((row) => trendSignalValue(row) && !direct.trendRows.includes(row)),
        mapTrendRow,
      )), directTrends),
    },
  }
}

function retrievalFromEvidence(queryEvidence: GenieQueryEvidence[], supplied: EvidenceDomainResult[]) {
  if (supplied.length > 0) return supplied
  const domains = ['trends', 'faculty', 'labs', 'equipment', 'projects'] as const
  return domains.flatMap((domain) => {
    const matches = queryEvidence.filter((evidence) => evidence.domain === domain)
    return matches.length > 0 ? [{
      domain,
      completed: true,
      attachmentCount: matches.length,
      rowCount: matches.reduce((total, evidence) => total + evidence.rowCount, 0),
    }] : []
  })
}

function calibrateDirectEvidence(
  analysis: CampusForgeAnalysis,
  query: string,
  queryEvidence: GenieQueryEvidence[],
  evidenceDomains: EvidenceDomainResult[],
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
  const canonicalEvidence = buildCanonicalEvidence(analysis, rows, {
    faculty,
    labs,
    equipment,
    projects,
    facultyRows: rawFaculty,
    labRows: rawLabs,
    equipmentRows: rawEquipment,
    projectRows: rawProjects,
    trendRows: uniqueTrendMatches.map(({ row }) => row),
  })
  const directFaculty = scoredItems(canonicalEvidence.faculty.direct, rawFaculty, 'faculty', facets)
  const directLabs = scoredItems(canonicalEvidence.labs.direct, rawLabs, 'labs', facets)
  const directEquipmentBase = scoredItems(canonicalEvidence.equipment.direct, rawEquipment, 'equipment', facets)
  const directProjectsBase = scoredItems(canonicalEvidence.projects.direct, rawProjects, 'projects', facets)
  const adjacentFaculty = scoredItems(
    canonicalEvidence.faculty.adjacent,
    rows.filter((row) => rowHasCategory(row, 'faculty') && !rawFaculty.includes(row)),
    'faculty', facets,
  )
  const adjacentLabs = scoredItems(
    canonicalEvidence.labs.adjacent,
    rows.filter((row) => rowHasCategory(row, 'labs') && !rawLabs.includes(row)),
    'labs', facets,
  )
  const adjacentEquipmentBase = scoredItems(
    canonicalEvidence.equipment.adjacent,
    rows.filter((row) => rowHasCategory(row, 'equipment') && !rawEquipment.includes(row)),
    'equipment', facets,
  )
  const adjacentProjectsBase = scoredItems(
    canonicalEvidence.projects.adjacent,
    rows.filter((row) => rowHasCategory(row, 'projects') && !rawProjects.includes(row)),
    'projects', facets,
  )
  const equipmentById = new Map(
    [...canonicalEvidence.equipment.direct, ...canonicalEvidence.equipment.adjacent]
      .map((item) => [normalizeEvidenceText(item.id), item]),
  )
  const withEquipmentDetails = (item: ScoredEvidenceItem): ScoredEquipmentItem => {
    const equipmentItem = equipmentById.get(item.id)
    return {
      ...item,
      status: equipmentItem?.status ?? 'Unavailable',
      utilization: equipmentItem?.utilization,
    }
  }
  const projectsById = new Map(
    [...canonicalEvidence.projects.direct, ...canonicalEvidence.projects.adjacent]
      .map((item) => [normalizeEvidenceText(item.id), item]),
  )
  const withProjectDetails = (item: ScoredEvidenceItem): ScoredProjectItem => ({
    ...item,
    status: projectsById.get(item.id)?.status ?? 'Ongoing',
  })
  const directTrends: ScoredTrendItem[] = canonicalEvidence.trends.direct.map((trend) => ({
    id: normalizeEvidenceText(trend.id),
    relevance: 1,
    growth: trend.growth,
    activityScore: trend.activityScore,
    provenanceStrength: 1,
  }))
  const uncoveredFacultyRequirements = facets.flatMap((facet, index) =>
    directFaculty.some((item) => (item.requirementCoverage[index] ?? 0) >= 0.75) ? [] : [facet.join(' ')])
  const readiness = calculateReadiness({
    requirementCount: Math.max(facets.length, 1),
    faculty: { direct: directFaculty, adjacent: adjacentFaculty },
    labs: { direct: directLabs, adjacent: adjacentLabs },
    equipment: {
      direct: directEquipmentBase.map(withEquipmentDetails),
      adjacent: adjacentEquipmentBase.map(withEquipmentDetails),
    },
    projects: {
      direct: directProjectsBase.map(withProjectDetails),
      adjacent: adjacentProjectsBase.map(withProjectDetails),
    },
    trends: { direct: directTrends, adjacent: [] },
    retrieval: retrievalFromEvidence(queryEvidence, evidenceDomains),
    uncoveredFacultyRequirements,
  })
  console.info('CampusForge direct evidence counts:', JSON.stringify({
    faculty: canonicalEvidence.faculty.direct.length,
    labs: canonicalEvidence.labs.direct.length,
    equipment: canonicalEvidence.equipment.direct.length,
    projects: canonicalEvidence.projects.direct.length,
    trends: canonicalEvidence.trends.direct.length,
  }))
  console.info('CampusForge Readiness Engine V2:', JSON.stringify({
    score: readiness.score,
    confidence: readiness.confidence,
    categories: readiness.categories,
  }))
  const canonicalLabs = [...canonicalEvidence.labs.direct, ...canonicalEvidence.labs.adjacent]
  const canonicalEquipment = mapEquipmentLabIds(
    [...canonicalEvidence.equipment.direct, ...canonicalEvidence.equipment.adjacent],
    canonicalLabs,
    queryEvidence,
  )
  const equipmentByCanonicalId = new Map(canonicalEquipment.map((item) => [normalizeEvidenceText(item.id), item]))
  const resolvedCanonicalEvidence: CanonicalEvidence = {
    ...canonicalEvidence,
    equipment: {
      direct: canonicalEvidence.equipment.direct.map((item) => equipmentByCanonicalId.get(normalizeEvidenceText(item.id)) ?? item),
      adjacent: canonicalEvidence.equipment.adjacent.map((item) => equipmentByCanonicalId.get(normalizeEvidenceText(item.id)) ?? item),
    },
  }

  return {
    ...analysis,
    faculty: [...resolvedCanonicalEvidence.faculty.direct, ...resolvedCanonicalEvidence.faculty.adjacent],
    labs: canonicalLabs,
    equipment: canonicalEquipment,
    projects: [...resolvedCanonicalEvidence.projects.direct, ...resolvedCanonicalEvidence.projects.adjacent],
    canonicalEvidence: resolvedCanonicalEvidence,
    opportunity: { ...analysis.opportunity, verdict: readiness.verdict },
    readiness: {
      ...analysis.readiness,
      score: readiness.score,
      maximum: readiness.maximum,
      confidence: readiness.confidence,
      categories: readiness.categories,
      disclaimer: `${analysis.readiness.disclaimer} Readiness Engine V2 scores direct evidence depth, relevance, breadth, capacity, and momentum; adjacent capabilities contribute only limited support.`,
    },
    researchTrend: {
      momentum: readiness.momentum,
      summary: uniqueTrendMatches.length > 0
        ? `Momentum is based on ${uniqueTrendMatches.length} directly matched research trend record${uniqueTrendMatches.length === 1 ? '' : 's'}.`
        : 'No directly matching research trend was found in the retrieved campus evidence. Adjacent research areas were not used as a substitute.',
    },
    gaps: readiness.gaps.map((gap) => ({
      id: `readiness-v2-${gap.code}`,
      title: gap.title,
      explanation: gap.explanation,
      evidenceKind: 'inferred-gap' as const,
    })),
    recommendation: { ...analysis.recommendation, verdict: readiness.verdict },
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
  evidenceDomains: EvidenceDomainResult[] = [],
): CampusForgeAnalysis {
  const orderedAttachments = [...(message.attachments ?? [])].sort((left, right) => {
    const priority = (attachment: GenieAttachment) => attachment.text?.purpose === 'TEXT_ATTACHMENT_PURPOSE_ANSWER' ? 0 : 1
    return priority(left) - priority(right)
  })

  for (const candidate of collectJsonCandidates(orderedAttachments)) {
    const parsed = parseCandidate(candidate)
    if (isCampusForgeAnalysis(parsed)) {
      const grounded = groundAnalysis(parsed, groundingMessage, queryEvidence)
      return calibrateDirectEvidence(grounded, query, queryEvidence, evidenceDomains)
    }
  }

  throw new CampusForgeAdapterError(
    'Genie completed, but its response could not be mapped to the CampusForge analysis contract.',
    summarizeGenieMessage(message),
  )
}
