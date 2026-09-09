import assert from 'node:assert/strict'
import test from 'node:test'
import {
  calculateReadiness,
  type EvidenceDomainResult,
  type ReadinessEngineInput,
  type ScoredEquipmentItem,
  type ScoredEvidenceItem,
  type ScoredProjectItem,
} from './readinessEngine.ts'

const completeRetrieval: EvidenceDomainResult[] = ['trends', 'faculty', 'labs', 'equipment', 'projects'].map((domain) => ({
  domain: domain as EvidenceDomainResult['domain'],
  completed: true,
  attachmentCount: 1,
  rowCount: 1,
}))

function item(id: string, attributes = ['capability']): ScoredEvidenceItem {
  return { id, relevance: 1, requirementCoverage: [1], attributes, provenanceStrength: 1 }
}

function equipment(id: string, status: ScoredEquipmentItem['status'], utilization = 20): ScoredEquipmentItem {
  return { ...item(id, [`equipment-${id}`]), status, utilization }
}

function project(id: string, status: ScoredProjectItem['status'] = 'Completed'): ScoredProjectItem {
  return { ...item(id, [`field-${id}`]), status }
}

function input(overrides: Partial<ReadinessEngineInput> = {}): ReadinessEngineInput {
  return {
    requirementCount: 1,
    faculty: { direct: [], adjacent: [] },
    labs: { direct: [], adjacent: [] },
    equipment: { direct: [], adjacent: [] },
    projects: { direct: [], adjacent: [] },
    trends: { direct: [], adjacent: [] },
    retrieval: completeRetrieval,
    ...overrides,
  }
}

test('no evidence produces zero readiness', () => {
  assert.equal(calculateReadiness(input()).score, 0)
})

test('trend-only evidence remains low readiness', () => {
  const result = calculateReadiness(input({
    trends: { direct: [{ id: 'trend', relevance: 1, growth: 'High', activityScore: 86, provenanceStrength: 1 }], adjacent: [] },
  }))
  assert.ok(result.score <= 15)
  assert.equal(result.momentum, 'High')
})

test('one faculty record cannot score highly', () => {
  const result = calculateReadiness(input({ faculty: { direct: [item('faculty')], adjacent: [] } }))
  assert.ok(result.score < 25)
  assert.ok(result.categories.faculty.score < result.categories.faculty.maximum)
})

test('strong direct evidence across all categories produces high readiness', () => {
  const result = calculateReadiness(input({
    faculty: { direct: [item('f1', ['ai', 'vision']), item('f2', ['sensors', 'embedded']), item('f3', ['agriculture', 'field systems'])], adjacent: [] },
    labs: { direct: [item('l1', ['ai', 'vision', 'training']), item('l2', ['sensors', 'embedded', 'field'])], adjacent: [] },
    equipment: { direct: [equipment('e1', 'Available'), equipment('e2', 'Available'), equipment('e3', 'Available'), equipment('e4', 'Available')], adjacent: [] },
    projects: { direct: [project('p1'), project('p2', 'Ongoing'), project('p3')], adjacent: [] },
    trends: { direct: [{ id: 'trend', relevance: 1, growth: 'High', activityScore: 100, provenanceStrength: 1 }], adjacent: [] },
  }))
  assert.ok(result.score >= 85)
})

test('adjacent-only evidence cannot produce strong readiness', () => {
  const adjacent = [item('a1'), item('a2'), item('a3')]
  const result = calculateReadiness(input({
    faculty: { direct: [], adjacent },
    labs: { direct: [], adjacent },
    equipment: { direct: [], adjacent: adjacent.map((value) => ({ ...value, status: 'Available' as const })) },
    projects: { direct: [], adjacent: adjacent.map((value) => ({ ...value, status: 'Completed' as const })) },
    trends: { direct: [], adjacent: [{ id: 'trend', relevance: 1, growth: 'High', provenanceStrength: 1 }] },
  }))
  assert.ok(result.score < 30)
  assert.equal(result.momentum, 'Low')
})

test('unavailable equipment scores below available equipment', () => {
  const available = calculateReadiness(input({ equipment: { direct: [equipment('e1', 'Available')], adjacent: [] } }))
  const unavailable = calculateReadiness(input({ equipment: { direct: [equipment('e1', 'Unavailable')], adjacent: [] } }))
  assert.ok(available.categories.equipment.score > unavailable.categories.equipment.score)
})

test('multiple complementary faculty outperform one faculty', () => {
  const one = calculateReadiness(input({ faculty: { direct: [item('f1', ['ai'])], adjacent: [] } }))
  const several = calculateReadiness(input({ faculty: { direct: [item('f1', ['ai']), item('f2', ['sensors']), item('f3', ['agriculture'])], adjacent: [] } }))
  assert.ok(several.categories.faculty.score > one.categories.faculty.score)
})

test('no direct trend produces no momentum points', () => {
  const result = calculateReadiness(input())
  assert.equal(result.categories.momentum.score, 0)
  assert.equal(result.momentum, 'Low')
})

test('the same evidence produces exactly the same result', () => {
  const evidence = input({ faculty: { direct: [item('f1'), item('f2')], adjacent: [] } })
  assert.deepEqual(calculateReadiness(evidence), calculateReadiness(evidence))
})

test('confidence decreases when evidence domains are missing', () => {
  const complete = calculateReadiness(input())
  const incomplete = calculateReadiness(input({ retrieval: completeRetrieval.slice(0, 3) }))
  assert.ok(incomplete.confidence < complete.confidence)
})
